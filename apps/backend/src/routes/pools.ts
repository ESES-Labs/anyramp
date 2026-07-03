import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import * as store from '../services/pools.service.ts';
import { paymentGateway } from '../db/schema.ts';

const createSchema = z.object({
  sellerAddress: z.string().min(1),
  pool: z.enum(['onramp', 'topup']),
  asset: z.enum(['USDC', 'XLM']),
  deposited: z.number().positive(),
  rateMarkupBps: z.number().int().min(0),
  maxOrderFiat: z.number().int().positive(),
  paymentGateways: z.array(z.enum(paymentGateway.enumValues)).default([]),
  apy: z.number().min(0),
});

export const pools = new Hono();

pools.get('/', async (c) => {
  return c.json(await store.listPools());
});

pools.get('/mine', async (c) => {
  const sellerAddress = c.req.query('sellerAddress');
  if (!sellerAddress) {
    throw new HTTPException(400, { message: 'sellerAddress query required' });
  }
  return c.json(await store.listPoolsBySeller(sellerAddress));
});

pools.get('/:id', async (c) => {
  const pool = await store.getPool(c.req.param('id'));
  if (!pool) throw new HTTPException(404, { message: 'not found' });
  return c.json(pool);
});

pools.post('/', zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json');
  const id = `LP-${Date.now().toString(36).slice(-4).toUpperCase()}-${body.asset}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const pool = await store.createPool({
    id,
    ...body,
    earnedFiat: 0,
  });
  return c.json(pool, 201);
});
