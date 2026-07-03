import {
  pgTable,
  text,
  integer,
  jsonb,
  timestamp,
  pgEnum,
  numeric,
} from 'drizzle-orm/pg-core';

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
  txHash: text('tx_hash'), // Stellar settlement tx once fulfilled
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

// Pool / liquidity position types for the Earn view.
export const poolType = pgEnum('pool_type', ['onramp', 'topup']);
export const assetType = pgEnum('asset_type', ['USDC', 'XLM']);
export const paymentGateway = pgEnum('payment_gateway', [
  'gopay-merchant',
  'dana-bisnis',
  'midtrans',
  'xendit',
  'mayar',
  'pakasir',
]);

export const pools = pgTable('pools', {
  id: text('id').primaryKey(),
  sellerAddress: text('seller_address').notNull(),
  pool: poolType('pool').notNull(),
  asset: assetType('asset').notNull(),
  deposited: numeric('deposited', { mode: 'number' }).notNull(),
  rateMarkupBps: integer('rate_markup_bps').notNull(),
  maxOrderFiat: integer('max_order_fiat').notNull(),
  paymentGateways: paymentGateway('payment_gateways').array().notNull().default([]),
  apy: numeric('apy', { mode: 'number' }).notNull(),
  earnedFiat: numeric('earned_fiat', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Pool = typeof pools.$inferSelect;
export type NewPool = typeof pools.$inferInsert;
