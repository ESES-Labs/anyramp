// Stellar/Soroban submission for AnyRampEscrow.
// - buildFulfillXdr: returns an unsigned, prepared tx for the buyer to sign in Freighter (trustless path).
// - autoSubmitFulfill: signs with SUBMITTER_SECRET and submits (demo path, buyer == submitter).
// - createOrderOnChain: seller locks USDC (demo helper).
import {
  rpc,
  TransactionBuilder,
  Contract,
  Address,
  nativeToScVal,
  xdr,
  Keypair,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { env } from '../config/env.ts';
import { proofToContractArgs, type ReclaimProofLike } from './zkprover.ts';
import type { Order } from '../db/schema.ts';

const server = () => new rpc.Server(env.SOROBAN_RPC_URL);
const contract = () => new Contract(env.ESCROW_CONTRACT_ID);

const scBytes = (b: Buffer | Uint8Array) => xdr.ScVal.scvBytes(Buffer.from(b));
const scText = (s: string) => scBytes(Buffer.from(s, 'utf8'));
const scAddr = (a: string) => new Address(a).toScVal();
const scU64 = (n: number | bigint) => nativeToScVal(BigInt(n), { type: 'u64' });
const scU32 = (n: number) => nativeToScVal(n, { type: 'u32' });
const scI128 = (n: string | bigint) => nativeToScVal(BigInt(n), { type: 'i128' });

function fulfillArgs(buyer: string, order: Order, proof: ReclaimProofLike): xdr.ScVal[] {
  const a = proofToContractArgs(proof);
  return [
    scAddr(buyer),
    scText(order.orderId),
    scBytes(a.provider),
    scBytes(a.parameters),
    scBytes(a.context),
    scBytes(a.owner),
    scU64(a.timestamp),
    scU64(a.epoch),
    scBytes(a.signature),
    scU32(a.recovery_id),
  ];
}

async function buildPrepared(sourcePublicKey: string, op: xdr.Operation) {
  const s = server();
  const account = await s.getAccount(sourcePublicKey);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: env.NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(120)
    .build();
  return s.prepareTransaction(tx);
}

async function signAndSend(prepared: Awaited<ReturnType<typeof buildPrepared>>, secret: string) {
  const s = server();
  prepared.sign(Keypair.fromSecret(secret));
  const sent = await s.sendTransaction(prepared);
  if (sent.status === 'ERROR') {
    throw new Error(`submit failed: ${JSON.stringify(sent.errorResult)}`);
  }
  // poll for completion
  let get = await s.getTransaction(sent.hash);
  for (let i = 0; i < 30 && get.status === 'NOT_FOUND'; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    get = await s.getTransaction(sent.hash);
  }
  if (get.status !== 'SUCCESS') {
    throw new Error(`tx ${sent.hash} -> ${get.status}`);
  }
  return sent.hash;
}

/** Trustless path: build the unsigned prepared tx for the buyer to sign in Freighter. */
export async function buildFulfillXdr(buyer: string, order: Order, proof: ReclaimProofLike) {
  const op = contract().call('fulfill_with_proof', ...fulfillArgs(buyer, order, proof));
  const prepared = await buildPrepared(buyer, op);
  return prepared.toXDR();
}

/** Demo path: submit with the server key acting as the buyer. */
export async function autoSubmitFulfill(order: Order, proof: ReclaimProofLike) {
  if (!env.SUBMITTER_SECRET) throw new Error('SUBMITTER_SECRET not set');
  const buyer = Keypair.fromSecret(env.SUBMITTER_SECRET).publicKey();
  const op = contract().call('fulfill_with_proof', ...fulfillArgs(buyer, order, proof));
  const prepared = await buildPrepared(buyer, op);
  const hash = await signAndSend(prepared, env.SUBMITTER_SECRET);
  return { hash, buyer };
}

/** Demo helper: seller (== submitter) locks USDC on-chain for this order. */
export async function createOrderOnChain(order: Order, project: string) {
  if (!env.SUBMITTER_SECRET) throw new Error('SUBMITTER_SECRET not set');
  const seller = Keypair.fromSecret(env.SUBMITTER_SECRET).publicKey();
  const op = contract().call(
    'create_order',
    scAddr(seller),
    scText(order.orderId),
    scText(project),
    scI128(order.usdcAmount),
    scU64(order.amountIdr),
    scU64(9_999_999_999),
  );
  const prepared = await buildPrepared(seller, op);
  const hash = await signAndSend(prepared, env.SUBMITTER_SECRET);
  return { hash, seller };
}

/** Submit a Freighter-signed tx XDR (from buildFulfillXdr). */
export async function submitSignedXdr(signedXdr: string) {
  const s = server();
  const tx = TransactionBuilder.fromXDR(signedXdr, env.NETWORK_PASSPHRASE);
  const sent = await s.sendTransaction(tx);
  if (sent.status === 'ERROR') throw new Error(`submit failed: ${JSON.stringify(sent.errorResult)}`);
  return sent.hash;
}
