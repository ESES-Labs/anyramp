// Mock of the Pakasir API (same shapes as https://pakasir.com/p/docs) so the whole
// backend loop runs before real sandbox credentials exist.
// Run: bun run mock   (env: MOCK_PORT, WEBHOOK_URL)
import { Hono } from 'hono';
import { env } from '../config/env.ts';
import { logger } from '../lib/logger.ts';

interface Tx {
  project: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'canceled';
  payment_method: string | null;
  completed_at: string | null;
  is_sandbox: boolean;
}
const txs = new Map<string, Tx>();

const app = new Hono();

app.post('/api/transactioncreate/:method', async (c) => {
  const { project, order_id, amount } = await c.req.json();
  txs.set(order_id, {
    project,
    order_id,
    amount,
    status: 'pending',
    payment_method: null,
    completed_at: null,
    is_sandbox: true,
  });
  const fee = Math.round(amount * 0.01);
  return c.json({
    payment: {
      project,
      order_id,
      amount,
      fee,
      total_payment: amount + fee,
      payment_method: c.req.param('method'),
      payment_number: `MOCK-QR-${order_id}`,
      expired_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    },
  });
});

app.post('/api/paymentsimulation', async (c) => {
  const { order_id } = await c.req.json();
  const tx = txs.get(order_id);
  if (!tx) return c.json({ error: 'transaction not found' }, 404);
  tx.status = 'completed';
  tx.payment_method = 'qris';
  tx.completed_at = new Date().toISOString();
  // fire-and-forget webhook, like the real sandbox
  fetch(env.WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: tx.amount,
      order_id: tx.order_id,
      project: tx.project,
      status: 'completed',
      payment_method: 'qris',
      completed_at: tx.completed_at,
    }),
  }).catch((err) => logger.error({ err: err.message }, 'webhook delivery failed'));
  return c.json({ simulated: true });
});

app.post('/api/transactioncancel', async (c) => {
  const { order_id } = await c.req.json();
  const tx = txs.get(order_id);
  if (!tx) return c.json({ error: 'transaction not found' }, 404);
  tx.status = 'canceled';
  return c.json({ canceled: true });
});

app.get('/api/transactiondetail', (c) => {
  const tx = txs.get(String(c.req.query('order_id')));
  if (!tx) return c.json({ error: 'transaction not found' }, 404);
  return c.json({ transaction: tx });
});

Bun.serve({ port: env.MOCK_PORT, fetch: app.fetch });
logger.info(`mock pakasir on :${env.MOCK_PORT} -> webhook ${env.WEBHOOK_URL}`);
