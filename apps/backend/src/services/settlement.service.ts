// End-to-end settlement pipeline, triggered by the Pakasir webhook once a real
// payment lands: re-verify against transactiondetail (source of truth) → generate
// a zkTLS proof of THIS order's completed payment → settle on-chain (escrow verifies
// the witness signature and releases USDC). Proving is retried a few times because
// the attestor step is the only flaky link.
import * as pakasir from './pakasir.ts';
import * as store from './orders.service.ts';
import { generateProof } from './zkprover.ts';
import { logger } from '../lib/logger.ts';

// One settlement per order at a time — the webhook can fire more than once.
const inFlight = new Set<string>();

const PROVE_ATTEMPTS = 3;

async function proveWithRetry(orderId: string, amount: number) {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= PROVE_ATTEMPTS; attempt++) {
    try {
      return await generateProof(orderId, amount);
    } catch (e) {
      lastErr = e;
      logger.warn({ orderId, attempt, err: (e as Error).message }, 'prove attempt failed');
    }
  }
  throw lastErr;
}

/**
 * Run the full settle pipeline for an order. Safe to call fire-and-forget from the
 * webhook; it self-guards against concurrent/duplicate runs and re-verifies payment.
 */
export async function runSettlement(orderId: string): Promise<void> {
  if (inFlight.has(orderId)) return;
  inFlight.add(orderId);
  try {
    const order = await store.getOrder(orderId);
    if (!order) return;
    if (order.status === 'fulfilled') return;

    // Source of truth: the webhook is only a hint — confirm the payment on Pakasir.
    const detail = await pakasir.transactionDetail(orderId, order.amountIdr);
    if (detail.status !== 'completed' || Number(detail.amount) < order.amountIdr) {
      logger.info({ orderId, status: detail.status }, 'settlement: not completed, skipping');
      return;
    }

    await store.updateOrder(orderId, { status: 'proving' });
    logger.info({ orderId }, 'settlement: payment confirmed, generating zk proof');
    const proof = await proveWithRetry(orderId, order.amountIdr);
    await store.updateOrder(orderId, { status: 'proved', proof });
    logger.info({ orderId }, 'settlement: proof ready — buyer claims to their wallet (or server settles)');
    // Stop at `proved`. The client drives the on-chain fulfill: an external wallet signs it
    // so the USDC lands in the buyer's own wallet (buyer.require_auth); embedded/no-wallet
    // orders fall back to the server-signed `/settle/auto`.
  } catch (e) {
    logger.error({ orderId, err: (e as Error).message }, 'settlement pipeline failed');
    // Leave a recoverable status so it can be retried (webhook resend / manual).
    await store.updateOrder(orderId, { status: 'paid_detected' }).catch(() => {});
  } finally {
    inFlight.delete(orderId);
  }
}
