// Dev-only: seed an order pre-loaded with a real proof so the on-chain submit path
// (/lock + /settle/auto) can be validated without waiting on live zkFetch.
// Usage: bun scripts/seed-proof-order.ts <proofFile> <orderId> <amountIdr>
import { readFileSync } from 'node:fs';
import { db } from '../src/db/index.ts';
import { orders } from '../src/db/schema.ts';

const [, , proofFile, orderIdArg, amountArg] = process.argv;
const path = proofFile ?? new URL('../../spikes/pakasir-proof.json', import.meta.url).pathname;
const proof = JSON.parse(readFileSync(path, 'utf8'));
const ctx = JSON.parse(proof.claimData.context).extractedParameters as Record<string, string>;
const orderId = orderIdArg ?? ctx.order_id!;
const amountIdr = Number(amountArg ?? ctx.amount ?? 120000);

await db
  .insert(orders)
  .values({
    orderId,
    amountIdr,
    usdcAmount: '100000000',
    sellerAddress: 'GAW24ZON4HHNOOO6SD33ZBZR6DNEFIRWJSIANJ5Q2CYTSC5UCQJEKKQC',
    status: 'proved',
    proof,
  })
  .onConflictDoUpdate({ target: orders.orderId, set: { proof, status: 'proved' } });

console.log(`seeded order ${orderId} (Rp${amountIdr}) with real proof from ${path}`);
process.exit(0);
