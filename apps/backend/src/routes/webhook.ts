import { Hono } from 'hono';
import * as store from '../services/orders.service.ts';
import { runSettlement } from '../services/settlement.service.ts';
import { logger } from '../lib/logger.ts';

export const webhook = new Hono();

// Pakasir webhook — a hint to start settling, never the source of truth. On a
// completed-payment hint we kick off the settle pipeline (which re-verifies against
// transactiondetail, proves the payment via zkTLS, then releases USDC on-chain).
webhook.post('/pakasir', async (c) => {
  const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
  const orderId = body.order_id as string | undefined;
  if (orderId && body.status === 'completed') {
    const order = await store.getOrder(orderId);
    if (order && order.status !== 'fulfilled' && Number(body.amount) >= order.amountIdr) {
      await store.updateOrder(orderId, { status: 'paid_detected' });
      logger.info({ orderId }, 'webhook: payment detected, starting settlement');
      void runSettlement(orderId); // fire-and-forget; self-guards against duplicates
    }
  }
  return c.json({ received: true });
});
