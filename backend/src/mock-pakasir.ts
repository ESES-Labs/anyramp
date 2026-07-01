// Mock of the Pakasir API (same shapes as https://pakasir.com/p/docs) so the whole
// backend loop runs before real sandbox credentials exist.
// Usage: node src/mock-pakasir.ts   (env: MOCK_PORT, WEBHOOK_URL)
import express from 'express';

const port = Number(process.env.MOCK_PORT ?? 4990);
const webhookUrl = process.env.WEBHOOK_URL ?? 'http://localhost:4000/webhook/pakasir';

interface Tx {
  project: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'canceled';
  payment_method: string | null;
  completed_at: string | null;
}
const txs = new Map<string, Tx>();

const app = express();
app.use(express.json());

app.post('/api/transactioncreate/:method', (req, res) => {
  const { project, order_id, amount } = req.body ?? {};
  txs.set(order_id, { project, order_id, amount, status: 'pending', payment_method: null, completed_at: null });
  const fee = Math.round(amount * 0.01);
  res.json({
    payment: {
      project, order_id, amount, fee,
      total_payment: amount + fee,
      payment_method: req.params.method,
      payment_number: `MOCK-QR-${order_id}`,
      expired_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    },
  });
});

app.post('/api/paymentsimulation', async (req, res) => {
  const tx = txs.get(req.body?.order_id);
  if (!tx) return res.status(404).json({ error: 'transaction not found' });
  tx.status = 'completed';
  tx.payment_method = 'qris';
  tx.completed_at = new Date().toISOString();
  // fire-and-forget webhook, like the real sandbox
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: tx.amount, order_id: tx.order_id, project: tx.project,
      status: 'completed', payment_method: 'qris', completed_at: tx.completed_at,
    }),
  }).catch(err => console.error('webhook delivery failed:', err.message));
  res.json({ simulated: true });
});

app.post('/api/transactioncancel', (req, res) => {
  const tx = txs.get(req.body?.order_id);
  if (!tx) return res.status(404).json({ error: 'transaction not found' });
  tx.status = 'canceled';
  res.json({ canceled: true });
});

app.get('/api/transactiondetail', (req, res) => {
  const tx = txs.get(String(req.query.order_id));
  if (!tx) return res.status(404).json({ error: 'transaction not found' });
  res.json({ transaction: tx });
});

app.listen(port, () => console.log(`mock pakasir on :${port} -> webhook ${webhookUrl}`));
