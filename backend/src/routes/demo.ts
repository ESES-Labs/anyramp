// Demo settle: skip the slow/flaky live zkTLS proving and settle a REAL pre-generated
// proof on-chain. The canonical demo order can only be settled once per escrow (nullifier),
// so we keep a POOL of pre-deployed+locked escrows warmed in the background — a demo click
// then costs just ONE fulfill tx (returned right after submit, ~5s).
import { Hono } from 'hono';
import { readFileSync } from 'node:fs';
import * as stellar from '../services/stellar.ts';
import * as store from '../services/orders.service.ts';
import type { ReclaimProofLike } from '../services/zkprover.ts';
import { logger } from '../lib/logger.ts';

export const demo = new Hono();

const PROOF_PATH = new URL('../../../spikes/pakasir-proof.json', import.meta.url).pathname;
const proof = JSON.parse(readFileSync(PROOF_PATH, 'utf8')) as ReclaimProofLike;
const ctx = JSON.parse(proof.claimData.context).extractedParameters as Record<string, string>;
const DEMO = {
  orderId: ctx.order_id!,
  amountIdr: Number(ctx.amount),
  usdcAmount: '100000000',
  project: ctx.project!,
};

// Pool of escrows already deployed + initialized + locked with the demo order,
// ready for a single fulfill tx.
const ready: string[] = [];
let filling = false;
const POOL_TARGET = 2;

async function provisionOne(): Promise<string> {
  const id = await stellar.deployAndInitEscrow();
  await stellar.lockOn(id, DEMO, DEMO.project);
  return id;
}

async function refill() {
  if (filling) return;
  filling = true;
  try {
    while (ready.length < POOL_TARGET) {
      const id = await provisionOne();
      ready.push(id);
      logger.info({ escrow: id, ready: ready.length }, 'demo: escrow warmed');
    }
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'demo: pool refill failed');
  } finally {
    filling = false;
  }
}

// Warm the pool in the background at startup.
refill();

demo.post('/settle', async (c) => {
  const body = await c.req.json().catch(() => ({}) as { forOrderId?: string });
  let escrow = ready.shift();
  if (!escrow) {
    // pool empty (cold start) — provision on demand, slower but reliable
    logger.info('demo: pool empty, provisioning on demand');
    escrow = await provisionOne();
  }
  const hash = await stellar.fulfillOn(escrow, { orderId: DEMO.orderId }, proof, false);
  void refill(); // top the pool back up in the background

  // Record the settlement against the buyer's order so History reflects it.
  if (body.forOrderId) {
    await store
      .updateOrder(body.forOrderId, { status: 'fulfilled', txHash: hash })
      .catch(() => {});
  }
  return c.json({ orderId: DEMO.orderId, hash, escrow });
});
