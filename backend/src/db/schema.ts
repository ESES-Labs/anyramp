import { pgTable, text, integer, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Mirrors the on-chain Order lifecycle. Webhook = 'paid_detected' hint only;
// 'proved'/'fulfilled' come from the zkTLS proof + on-chain settlement.
export const orderStatus = pgEnum('order_status', [
  'created',
  'paid_detected',
  'proving',
  'proved',
  'fulfilled',
  'expired',
]);

export const orders = pgTable('orders', {
  orderId: text('order_id').primaryKey(),
  amountIdr: integer('amount_idr').notNull(),
  usdcAmount: text('usdc_amount').notNull(), // i128 stroop-precision string
  sellerAddress: text('seller_address').notNull(),
  buyerAddress: text('buyer_address'),
  qrString: text('qr_string'),
  totalPayment: integer('total_payment'),
  expiredAt: text('expired_at'),
  status: orderStatus('status').notNull().default('created'),
  proof: jsonb('proof'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
