import express from 'express';
import { config } from './config.ts';
import * as pakasir from './pakasir.ts';
import * as store from './orders.ts';
import { generateProof, proofToContractArgs, type ReclaimProofLike } from './zkprover.ts';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Seller intent: register an order and issue the QRIS the buyer must pay.
app.post('/orders', async (req, res) => {
  try {
    const { orderId, amountIdr, usdcAmount, sellerAddress, buyerAddress } = req.body ?? {};
    if (!orderId || !amountIdr || !usdcAmount || !sellerAddress) {
      return res.status(400).json({ error: 'orderId, amountIdr, usdcAmount, sellerAddress required' });
    }
    const payment = await pakasir.createTransaction(orderId, amountIdr);
    const order = store.createOrder({
      orderId,
      amountIdr,
      usdcAmount,
      sellerAddress,
      buyerAddress,
      qrString: payment.payment_number,
      totalPayment: payment.total_payment,
      expiredAt: payment.expired_at,
    });
    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/orders/:id', (req, res) => {
  const order = store.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  res.json(order);
});

app.get('/orders', (_req, res) => res.json(store.listOrders()));

// Pakasir webhook — a hint to start proving, never the source of truth.
app.post('/webhook/pakasir', (req, res) => {
  const { order_id, status, amount } = req.body ?? {};
  const order = order_id && store.getOrder(order_id);
  if (order && status === 'completed' && Number(amount) >= order.amountIdr && order.status === 'created') {
    store.updateOrder(order_id, { status: 'paid_detected' });
  }
  res.json({ received: true });
});

// Cross-check against the real transactiondetail API (recommended by Pakasir docs).
app.get('/orders/:id/detail', async (req, res) => {
  const order = store.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  try {
    res.json(await pakasir.transactionDetail(order.orderId, order.amountIdr));
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
});

// Generate the zkTLS proof and return the ready-to-sign contract args.
app.post('/orders/:id/prove', async (req, res) => {
  const order = store.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  try {
    store.updateOrder(order.orderId, { status: 'proving' });
    const proof = await generateProof(order.orderId, order.amountIdr);
    const updated = store.updateOrder(order.orderId, { status: 'proved', proof });
    res.json({ order: updated, contractArgs: serializeArgs(proofToContractArgs(proof)) });
  } catch (e) {
    store.updateOrder(order.orderId, { status: 'paid_detected' });
    res.status(500).json({ error: String(e) });
  }
});

function serializeArgs(args: ReturnType<typeof proofToContractArgs>) {
  return Object.fromEntries(
    Object.entries(args).map(([k, v]) => [k, Buffer.isBuffer(v) ? v.toString('hex') : v]),
  );
}

// Dev helper: trigger a sandbox payment simulation for an order.
app.post('/orders/:id/simulate', async (req, res) => {
  const order = store.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  try {
    res.json(await pakasir.simulatePayment(order.orderId, order.amountIdr));
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
});

app.listen(config.port, () => {
  console.log(`anyramp backend on :${config.port} (pakasir base: ${config.pakasirBaseUrl})`);
});

export type { ReclaimProofLike };
