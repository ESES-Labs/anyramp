import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import * as store from '../services/orders.service.ts';
import * as pakasir from '../services/pakasir.ts';
import { generateProof, proofToContractArgs } from '../services/zkprover.ts';

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

// Generate the zkTLS proof and return the ready-to-sign contract args.
orders.post('/:id/prove', async (c) => {
  const order = await store.getOrder(c.req.param('id'));
  if (!order) throw new HTTPException(404, { message: 'not found' });
  try {
    await store.updateOrder(order.orderId, { status: 'proving' });
    const proof = await generateProof(order.orderId, order.amountIdr);
    const updated = await store.updateOrder(order.orderId, { status: 'proved', proof });
    return c.json({ order: updated, contractArgs: serializeArgs(proofToContractArgs(proof)) });
  } catch (e) {
    await store.updateOrder(order.orderId, { status: 'paid_detected' });
    throw e;
  }
});

function serializeArgs(args: ReturnType<typeof proofToContractArgs>) {
  return Object.fromEntries(
    Object.entries(args).map(([k, v]) => [k, Buffer.isBuffer(v) ? v.toString('hex') : v]),
  );
}
