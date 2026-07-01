// zkFetch proof generation for the Pakasir transactiondetail endpoint,
// plus mapping of a Reclaim proof onto AnyRampEscrow.fulfill_with_proof args.
//
// Requires RECLAIM_APP_ID / RECLAIM_APP_SECRET (free: https://dev.reclaimprotocol.org)
// and `@reclaimprotocol/zk-fetch` — both deferred until credentials exist.
import { env } from '../config/env.ts';

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

export async function generateProof(orderId: string, amount: number): Promise<ReclaimProofLike> {
  if (!env.RECLAIM_APP_ID || !env.RECLAIM_APP_SECRET) {
    throw new Error('RECLAIM_APP_ID / RECLAIM_APP_SECRET not set — register at dev.reclaimprotocol.org');
  }
  const { ReclaimClient } = await import('@reclaimprotocol/zk-fetch');
  const client = new ReclaimClient(env.RECLAIM_APP_ID, env.RECLAIM_APP_SECRET);

  // The deployed attestor caps redacted chars in the URL at 24 (probed 2026-07-02),
  // so the full 32-char api_key can't be hidden. We hide only the last 14 chars
  // (~83 bits stay secret) via secret paramValues; the proof and the on-chain
  // `parameters` blob then contain `api_key=<head>{{apiKeyTail}}`.
  const TAIL = 14;
  const keyHead = env.PAKASIR_API_KEY.slice(0, -TAIL);
  const keyTail = env.PAKASIR_API_KEY.slice(-TAIL);
  const url =
    `${env.PAKASIR_BASE_URL}/api/transactiondetail` +
    `?project=${env.PAKASIR_PROJECT}&amount=${amount}&order_id=${orderId}&api_key=${keyHead}{{apiKeyTail}}`;

  const proof = await client.zkFetch(
    url,
    { method: 'GET' },
    {
      paramValues: { apiKeyTail: keyTail },
      responseMatches: [
        {
          type: 'regex',
          value:
            '"amount":(?<amount>[\\d]+),"order_id":"(?<order_id>[^"]+)","project":"(?<project>[^"]+)","status":"(?<status>[^"]+)"',
        },
        // Production hardening: the contract must reject proofs where is_sandbox=true.
        { type: 'regex', value: '"is_sandbox":(?<is_sandbox>true|false)' },
      ],
    },
  );
  return proof as ReclaimProofLike;
}

/** Split a Reclaim 65-byte signature into the (64-byte sig, recovery_id) pair the contract wants. */
export function splitSignature(sig65hex: string): { signature: Buffer; recoveryId: number } {
  const raw = Buffer.from(sig65hex.replace(/^0x/, ''), 'hex');
  if (raw.length !== 65) throw new Error(`expected 65-byte signature, got ${raw.length}`);
  return { signature: raw.subarray(0, 64), recoveryId: raw[64]! - 27 };
}

/** Shape a proof into the exact argument list of AnyRampEscrow.fulfill_with_proof. */
export function proofToContractArgs(proof: ReclaimProofLike) {
  const c = proof.claimData;
  const { signature, recoveryId } = splitSignature(proof.signatures[0]!);
  return {
    provider: Buffer.from(c.provider, 'utf8'),
    parameters: Buffer.from(c.parameters, 'utf8'),
    context: Buffer.from(c.context, 'utf8'),
    owner: Buffer.from(c.owner, 'utf8'),
    timestamp: c.timestampS,
    epoch: c.epoch,
    signature,
    recovery_id: recoveryId,
  };
}
