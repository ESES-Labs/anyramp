// Background worker so settlement never depends on a browser tab staying open. Each tick it:
//  1. Confirms payment + proves any paid-but-unproved order (server-side, no browser).
//  2. Server-settles a `proved` order the buyer didn't claim within the grace window, so a
//     paid order can never get stuck (funds land in the operator escrow to be reconciled).
// The happy path — the buyer signing the fulfill so USDC lands in their OWN wallet — still
// runs in the frontend while the tab is open; this is the safety net.
import * as store from './orders.service.ts';
import * as stellar from './stellar.ts';
import { runSettlement } from './settlement.service.ts';
import type { ReclaimProofLike } from './zkprover.ts';
import { env } from '../config/env.ts';
import { logger } from '../lib/logger.ts';

// Orders older than this are abandoned (QR long expired) — stop working them.
const ORDER_TTL_MS = 30 * 60_000;
// Grace for the buyer to claim to their own wallet before the server settles it.
const CLAIM_GRACE_MS = 5 * 60_000;

let sweeping = false;

async function sweep() {
  if (sweeping) return;
  sweeping = true;
  try {
    const orders = await store.listOrders();
    const now = Date.now();
    for (const o of orders) {
      if (now - new Date(o.createdAt).getTime() > ORDER_TTL_MS) continue;

      if (o.status === 'created' || o.status === 'paid_detected') {
        await runSettlement(o.orderId); // confirms payment + proves; no-op until paid
      } else if (o.status === 'proved' && o.proof) {
        if (now - new Date(o.updatedAt).getTime() < CLAIM_GRACE_MS) continue;
        try {
          const { hash } = await stellar.autoSubmitFulfill(o, o.proof as unknown as ReclaimProofLike);
          await store.updateOrder(o.orderId, { status: 'fulfilled', txHash: hash });
          logger.info({ orderId: o.orderId, hash }, 'worker: server-settled unclaimed order');
        } catch (e) {
          logger.warn({ orderId: o.orderId, err: (e as Error).message }, 'worker: server-settle failed');
        }
      }
    }
  } finally {
    sweeping = false;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startSettlementWorker() {
  if (!env.ENABLE_SETTLEMENT_WORKER || timer) return;
  const run = () =>
    sweep().catch((e) => logger.error({ err: (e as Error).message }, 'settlement sweep failed'));
  timer = setInterval(run, env.SETTLEMENT_POLL_MS);
  run();
  logger.info({ pollMs: env.SETTLEMENT_POLL_MS }, 'settlement worker started');
}
