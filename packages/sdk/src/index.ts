// @anyramp/sdk — the single typed entry point for the AnyRamp escrow contract.
// Wraps the auto-generated contract bindings so consumers (backend, scripts, tests)
// never hand-build ScVals. Regenerate `@anyramp/escrow-bindings` when the contract
// changes and the types below flow through automatically.

import { Client as EscrowContract } from '@anyramp/escrow-bindings';
import { basicNodeSigner } from '@stellar/stellar-sdk/contract';
import { Keypair } from '@stellar/stellar-sdk';

export * from './proof.ts';
export { EscrowContract };
export type { Order } from '@anyramp/escrow-bindings';

export interface EscrowClientOptions {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
  /** Secret key (S...) of the account that signs & submits. */
  secretKey: string;
}

/**
 * Build a typed escrow client bound to a signer. Every method returns an
 * AssembledTransaction — call `.signAndSend()` to submit.
 *
 *   const escrow = makeEscrowClient({ ... });
 *   const tx = await escrow.fulfill_with_proof({ buyer, ...proofToFulfillArgs(id, proof) });
 *   const { result } = await tx.signAndSend();
 */
export function makeEscrowClient(opts: EscrowClientOptions): EscrowContract {
  const kp = Keypair.fromSecret(opts.secretKey);
  const signer = basicNodeSigner(kp, opts.networkPassphrase);
  return new EscrowContract({
    contractId: opts.contractId,
    rpcUrl: opts.rpcUrl,
    networkPassphrase: opts.networkPassphrase,
    publicKey: kp.publicKey(),
    signTransaction: signer.signTransaction,
  });
}

/** Public key for a secret, without exposing Keypair to callers. */
export function publicKeyOf(secretKey: string): string {
  return Keypair.fromSecret(secretKey).publicKey();
}
