import { Hono } from 'hono';
import * as store from '../services/orders.service.ts';
import { logger } from '../lib/logger.ts';

export const webhook = new Hono();

// Pakasir webhook — a hint to start proving, never the source of truth.
webhook.post('/pakasir', async (c) => {
  const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
  const orderId = body.order_id as string | undefined;
  if (orderId) {
    const order = await store.getOrder(orderId);
    if (
      order &&
      body.status === 'completed' &&
      Number(body.amount) >= order.amountIdr &&
      order.status === 'created'
    ) {
      await store.updateOrder(orderId, { status: 'paid_detected' });
      logger.info({ orderId }, 'webhook: payment detected');
    }
  }
  return c.json({ received: true });
});
