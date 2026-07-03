import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.ts';

export const health = new Hono();

health.get('/', (c) => c.json({ ok: true, service: 'anyramp-backend' }));

health.get('/db', async (c) => {
  await db.execute(sql`select 1`);
  return c.json({ ok: true, db: 'up' });
});
