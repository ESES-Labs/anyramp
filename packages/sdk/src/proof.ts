// Single source of truth for turning a Reclaim proof into the exact argument
// shape the escrow's fulfill_with_proof expects. Lives in the SDK so backend and
// any other consumer share it — no hand-built ScVals anywhere.

export interface ReclaimProofLike {
  claimData: {
    provider: string;
    parameters: string;
    context: string;
    owner: string;
    timestampS: number;
    epoch: number;
    identifier: string;
  };
  signatures: string[]; // 65-byte hex, 0x-prefixed
}

/** Split a Reclaim 65-byte signature into the (64-byte sig, recovery_id) pair. */
export function splitSignature(sig65hex: string): { signature: Buffer; recoveryId: number } {
  const raw = Buffer.from(sig65hex.replace(/^0x/, ''), 'hex');
  if (raw.length !== 65) throw new Error(`expected 65-byte signature, got ${raw.length}`);
  return { signature: raw.subarray(0, 64), recoveryId: raw[64]! - 27 };
}

export interface FulfillArgs {
  order_id: Buffer;
  provider: Buffer;
  parameters: Buffer;
  context: Buffer;
  owner: Buffer;
  timestamp: bigint;
  epoch: bigint;
  signature: Buffer;
  recovery_id: number;
}

/** Map a proof (+ order id) onto fulfill_with_proof args (minus the `buyer` address). */
export function proofToFulfillArgs(orderId: string, proof: ReclaimProofLike): FulfillArgs {
  const c = proof.claimData;
  const { signature, recoveryId } = splitSignature(proof.signatures[0]!);
  return {
    order_id: Buffer.from(orderId, 'utf8'),
    provider: Buffer.from(c.provider, 'utf8'),
    parameters: Buffer.from(c.parameters, 'utf8'),
    context: Buffer.from(c.context, 'utf8'),
    owner: Buffer.from(c.owner, 'utf8'),
    timestamp: BigInt(c.timestampS),
    epoch: BigInt(c.epoch),
    signature,
    recovery_id: recoveryId,
  };
}

/** Convenience: the proven values from a proof's context. */
export function extractedParams(proof: ReclaimProofLike): Record<string, string> {
  return JSON.parse(proof.claimData.context).extractedParameters ?? {};
}
