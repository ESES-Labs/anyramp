import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { pools, type Pool, type NewPool } from '../db/schema.ts';

export async function createPool(o: NewPool): Promise<Pool> {
  const [row] = await db.insert(pools).values(o).returning();
  if (!row) throw new Error('failed to create pool');
  return row;
}

export async function getPool(id: string): Promise<Pool | undefined> {
  const [row] = await db.select().from(pools).where(eq(pools.id, id));
  return row;
}

export async function listPools(): Promise<Pool[]> {
  return db.select().from(pools).orderBy(desc(pools.createdAt));
}

export async function listPoolsBySeller(sellerAddress: string): Promise<Pool[]> {
  return db
    .select()
    .from(pools)
    .where(eq(pools.sellerAddress, sellerAddress))
    .orderBy(desc(pools.createdAt));
}

export async function updatePool(id: string, patch: Partial<NewPool>): Promise<Pool> {
  const [row] = await db
    .update(pools)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(pools.id, id))
    .returning();
  if (!row) throw new Error(`pool ${id} not found`);
  return row;
}
