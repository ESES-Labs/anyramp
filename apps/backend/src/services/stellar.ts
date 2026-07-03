// Thin backend layer over @anyramp/sdk. All contract-arg building lives in the SDK
// (generated bindings + proof mapping) — this file only wires env + submits.
// Contract layout/address changes: regenerate @anyramp/escrow-bindings, done.
import { rpc, TransactionBuilder } from '@stellar/stellar-sdk';
import {
  makeEscrowClient,
  EscrowContract,
  publicKeyOf,
  proofToFulfillArgs,
  type ReclaimProofLike,
} from '@anyramp/sdk';
import { env } from '../config/env.ts';
import type { Order } from '../db/schema.ts';

const submitterPk = () => publicKeyOf(env.SUBMITTER_SECRET);

function escrow(contractId: string) {
  return makeEscrowClient({
    contractId,
    rpcUrl: env.SOROBAN_RPC_URL,
    networkPassphrase: env.NETWORK_PASSPHRASE,
    secretKey: env.SUBMITTER_SECRET,
  });
}

// Escrow deploy + initialize is a one-off ops action done with the stellar CLI outside the
// app (see deploy docs), so the running backend needs no CLI — only the SDK + submitter key.

// Testnet RPC frequently rejects a submit with a transient TRY_AGAIN_LATER; retry
// the whole build+sign+send a few times with backoff before giving up.
const TRANSIENT = /TRY_AGAIN_LATER|Sending the transaction to the network failed|TIMEOUT|ECONNRESET|502|503|504/i;

async function withSubmitRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!TRANSIENT.test((e as Error).message ?? '') || i === attempts) throw e;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw lastErr;
}

// --- Seller locks USDC (typed, via SDK). ---
export async function lockOn(
  contractId: string,
  o: { orderId: string; usdcAmount: string; amountIdr: number },
  project: string,
) {
  return withSubmitRetry(async () => {
    const tx = await escrow(contractId).create_order({
      seller: submitterPk(),
      order_id: Buffer.from(o.orderId, 'utf8'),
      project: Buffer.from(project, 'utf8'),
      usdc_amount: BigInt(o.usdcAmount),
      expected_idr: BigInt(o.amountIdr),
      expiry: 9_999_999_999n,
    });
    try {
      const sent = await tx.signAndSend();
      return sent.sendTransactionResponse?.hash ?? '';
    } catch (e) {
      // A prior attempt already created the order (confirmation just didn't reach us).
      if (/Error\(Contract, #3\)/.test((e as Error).message ?? '')) return '';
      throw e;
    }
  });
}

export async function createOrderOnChain(order: Order, project: string) {
  const hash = await lockOn(
    env.ESCROW_CONTRACT_ID,
    { orderId: order.orderId, usdcAmount: order.usdcAmount, amountIdr: order.amountIdr },
    project,
  );
  return { hash, seller: submitterPk() };
}

// --- Fulfill with a proof (typed, via SDK). ---
export async function fulfillOn(
  contractId: string,
  order: { orderId: string },
  proof: ReclaimProofLike,
) {
  return withSubmitRetry(async () => {
    const tx = await escrow(contractId).fulfill_with_proof({
      buyer: submitterPk(),
      ...proofToFulfillArgs(order.orderId, proof),
    });
    const sent = await tx.signAndSend();
    return sent.sendTransactionResponse?.hash ?? '';
  });
}

export async function autoSubmitFulfill(order: Order, proof: ReclaimProofLike) {
  const hash = await fulfillOn(env.ESCROW_CONTRACT_ID, order, proof);
  return { hash, buyer: submitterPk() };
}

/**
 * Trustless path: build the unsigned fulfill tx XDR for the buyer to sign in their wallet.
 * The tx SOURCE is the buyer, so `buyer.require_auth()` is satisfied by the buyer's own
 * envelope signature (Freighter signs it) — no cross-account Soroban auth entries needed,
 * and the USDC lands in the buyer's wallet.
 */
export async function buildFulfillXdr(buyer: string, order: Order, proof: ReclaimProofLike) {
  const client = new EscrowContract({
    contractId: env.ESCROW_CONTRACT_ID,
    rpcUrl: env.SOROBAN_RPC_URL,
    networkPassphrase: env.NETWORK_PASSPHRASE,
    publicKey: buyer,
  });
  const tx = await client.fulfill_with_proof(
    { buyer, ...proofToFulfillArgs(order.orderId, proof) },
    { simulate: true },
  );
  return tx.toXDR();
}

/** Submit a wallet-signed tx XDR. */
export async function submitSignedXdr(signedXdr: string) {
  const s = new rpc.Server(env.SOROBAN_RPC_URL);
  const tx = TransactionBuilder.fromXDR(signedXdr, env.NETWORK_PASSPHRASE);
  const sent = await s.sendTransaction(tx);
  if (sent.status === 'ERROR') throw new Error(`submit failed: ${JSON.stringify(sent.errorResult)}`);
  return sent.hash;
}
