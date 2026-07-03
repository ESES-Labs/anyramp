import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { orders, type Order, type NewOrder } from '../db/schema.ts';

export async function createOrder(o: NewOrder): Promise<Order> {
  const [row] = await db.insert(orders).values(o).returning();
  return row!;
}

export async function getOrder(orderId: string): Promise<Order | undefined> {
  const [row] = await db.select().from(orders).where(eq(orders.orderId, orderId));
  return row;
}

export async function updateOrder(orderId: string, patch: Partial<NewOrder>): Promise<Order> {
  const [row] = await db
    .update(orders)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(orders.orderId, orderId))
    .returning();
  if (!row) throw new Error(`order ${orderId} not found`);
  return row;
}

export async function listOrders(): Promise<Order[]> {
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}
