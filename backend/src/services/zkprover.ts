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
  // @reclaimprotocol/zk-fetch needs npm-built deps + Node 20 (crypto.randomBytes,
  // WebSocket), so proving runs in an isolated package under prover/ via a real Node
  // binary (PROVE_NODE_BIN). zkTLS proving takes ~1-3 min; use async spawn so the
  // Bun event loop is never blocked. The redaction pattern lives in prover/prove.mjs.
  const { spawn } = await import('node:child_process');
  const node = env.PROVE_NODE_BIN || 'node';
  return await new Promise<ReclaimProofLike>((resolve, reject) => {
    const child = spawn(node, ['prove.mjs', orderId, String(amount)], {
      cwd: 'prover',
      env: process.env,
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 300_000);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`prove failed: ${err.slice(-500) || 'exit ' + code}`));
      try {
        resolve(JSON.parse(out) as ReclaimProofLike);
      } catch {
        reject(new Error(`prove: bad JSON output`));
      }
    });
  });
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
