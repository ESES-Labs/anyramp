// In-memory order store — mirrors the on-chain Order in contracts/escrow.
// Good enough for the hackathon; swap for SQLite/Postgres later if needed.

export type OrderStatus =
  | 'created'        // order registered, QRIS issued, waiting for fiat payment
  | 'paid_detected'  // webhook says completed (hint only — proof is the source of truth)
  | 'proving'        // zkFetch proof generation in progress
  | 'proved'         // proof ready, waiting for buyer to submit on-chain
  | 'fulfilled'      // USDC released on-chain
  | 'expired';

export interface Order {
  orderId: string;
  amountIdr: number;
  usdcAmount: string;      // stroop-precision string, matches contract i128
  sellerAddress: string;   // Stellar G... address of the USDC locker
  buyerAddress?: string;   // Stellar G... address that will receive USDC
  qrString?: string;
  totalPayment?: number;
  expiredAt?: string;
  status: OrderStatus;
  proof?: unknown;         // Reclaim proof JSON once generated
  createdAt: string;
  updatedAt: string;
}

const orders = new Map<string, Order>();

export function createOrder(o: Omit<Order, 'status' | 'createdAt' | 'updatedAt'>): Order {
  if (orders.has(o.orderId)) throw new Error(`order ${o.orderId} already exists`);
  const now = new Date().toISOString();
  const order: Order = { ...o, status: 'created', createdAt: now, updatedAt: now };
  orders.set(order.orderId, order);
  return order;
}

export function getOrder(orderId: string): Order | undefined {
  return orders.get(orderId);
}

export function updateOrder(orderId: string, patch: Partial<Order>): Order {
  const order = orders.get(orderId);
  if (!order) throw new Error(`order ${orderId} not found`);
  const updated = { ...order, ...patch, updatedAt: new Date().toISOString() };
  orders.set(orderId, updated);
  return updated;
}

export function listOrders(): Order[] {
  return [...orders.values()];
}
