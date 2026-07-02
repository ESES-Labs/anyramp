import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import * as store from '../services/orders.service.ts';
import * as pakasir from '../services/pakasir.ts';
import * as stellar from '../services/stellar.ts';
import { generateProof, proofToContractArgs, type ReclaimProofLike } from '../services/zkprover.ts';
import { env } from '../config/env.ts';
import { logger } from '../lib/logger.ts';

async function requireProof(id: string) {
  const order = await store.getOrder(id);
  if (!order) throw new HTTPException(404, { message: 'not found' });
  if (!order.proof) throw new HTTPException(409, { message: 'no proof yet — call /prove first' });
  return { order, proof: order.proof as unknown as ReclaimProofLike };
}

const createSchema = z.object({
  orderId: z.string().min(1),
  amountIdr: z.number().int().positive(),
  usdcAmount: z.string().min(1), // i128 stroop string
  sellerAddress: z.string().min(1),
  buyerAddress: z.string().optional(),
});

export const orders = new Hono();

// Seller intent: register an order and issue the QRIS the buyer must pay.
orders.post('/', zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json');
  if (await store.getOrder(body.orderId)) {
    throw new HTTPException(409, { message: `order ${body.orderId} already exists` });
  }
  const payment = await pakasir.createTransaction(body.orderId, body.amountIdr);
  const order = await store.createOrder({
    orderId: body.orderId,
    amountIdr: body.amountIdr,
    usdcAmount: body.usdcAmount,
    sellerAddress: body.sellerAddress,
    buyerAddress: body.buyerAddress ?? null,
    qrString: payment.payment_number,
    totalPayment: payment.total_payment,
    expiredAt: payment.expired_at,
  });
  return c.json(order, 201);
});

orders.get('/', async (c) => c.json(await store.listOrders()));

orders.get('/:id', async (c) => {
  const order = await store.getOrder(c.req.param('id'));
  if (!order) throw new HTTPException(404, { message: 'not found' });
  return c.json(order);
});

// Cross-check against the real transactiondetail API (recommended by Pakasir docs).
orders.get('/:id/detail', async (c) => {
  const order = await store.getOrder(c.req.param('id'));
  if (!order) throw new HTTPException(404, { message: 'not found' });
  return c.json(await pakasir.transactionDetail(order.orderId, order.amountIdr));
});

// Dev helper: trigger a sandbox payment simulation for an order.
orders.post('/:id/simulate', async (c) => {
  const order = await store.getOrder(c.req.param('id'));
  if (!order) throw new HTTPException(404, { message: 'not found' });
  return c.json(await pakasir.simulatePayment(order.orderId, order.amountIdr));
});

// Kick off zkTLS proof generation (takes ~1-3 min) in the background and return
// immediately; the client polls GET /orders/:id until status becomes 'proved'.
orders.post('/:id/prove', async (c) => {
  const order = await store.getOrder(c.req.param('id'));
  if (!order) throw new HTTPException(404, { message: 'not found' });
  await store.updateOrder(order.orderId, { status: 'proving' });
  void generateProof(order.orderId, order.amountIdr)
    .then((proof) => store.updateOrder(order.orderId, { status: 'proved', proof }))
    .then(() => logger.info({ orderId: order.orderId }, 'proof ready'))
    .catch(async (e) => {
      logger.error({ orderId: order.orderId, err: (e as Error).message }, 'prove failed');
      await store.updateOrder(order.orderId, { status: 'paid_detected' });
    });
  return c.json({ status: 'proving', message: 'poll GET /orders/:id until status=proved' }, 202);
});

// Return the ready-to-sign contract args for a proved order.
orders.get('/:id/proof-args', async (c) => {
  const { proof } = await requireProof(c.req.param('id'));
  return c.json({ contractArgs: serializeArgs(proofToContractArgs(proof)) });
});

function serializeArgs(args: ReturnType<typeof proofToContractArgs>) {
  return Object.fromEntries(
    Object.entries(args).map(([k, v]) => [k, Buffer.isBuffer(v) ? v.toString('hex') : v]),
  );
}

// --- On-chain settlement ---

// Demo helper: seller (server key) locks USDC on-chain for this order.
orders.post('/:id/lock', async (c) => {
  const order = await store.getOrder(c.req.param('id'));
  if (!order) throw new HTTPException(404, { message: 'not found' });
  const res = await stellar.createOrderOnChain(order, env.PAKASIR_PROJECT);
  return c.json(res);
});

// Trustless path: return the prepared, unsigned tx XDR for the buyer to sign in Freighter.
orders.post('/:id/settle', zValidator('json', z.object({ buyerAddress: z.string().min(1) })), async (c) => {
  const { order, proof } = await requireProof(c.req.param('id'));
  const xdr = await stellar.buildFulfillXdr(c.req.valid('json').buyerAddress, order, proof);
  return c.json({ xdr, networkPassphrase: env.NETWORK_PASSPHRASE });
});

// Buyer submits the Freighter-signed XDR back; we relay it and mark fulfilled.
orders.post('/:id/submit', zValidator('json', z.object({ signedXdr: z.string().min(1) })), async (c) => {
  const order = await store.getOrder(c.req.param('id'));
  if (!order) throw new HTTPException(404, { message: 'not found' });
  const hash = await stellar.submitSignedXdr(c.req.valid('json').signedXdr);
  const updated = await store.updateOrder(order.orderId, { status: 'fulfilled' });
  return c.json({ hash, order: updated });
});

// Demo path: submit with the server key acting as the buyer.
orders.post('/:id/settle/auto', async (c) => {
  const { order, proof } = await requireProof(c.req.param('id'));
  const { hash, buyer } = await stellar.autoSubmitFulfill(order, proof);
  const updated = await store.updateOrder(order.orderId, { status: 'fulfilled' });
  return c.json({ hash, buyer, order: updated });
});
