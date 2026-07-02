// Dev-only: seed an order pre-loaded with the real spike proof so the on-chain
// submit path (/lock + /settle/auto) can be validated without live zkFetch.
import { readFileSync } from 'node:fs';
import { db } from '../src/db/index.ts';
import { orders } from '../src/db/schema.ts';

const proof = JSON.parse(readFileSync(new URL('../../spikes/pakasir-proof.json', import.meta.url), 'utf8'));

await db
  .insert(orders)
  .values({
    orderId: 'ZKP-1782946317542',
    amountIdr: 120000,
    usdcAmount: '100000000',
    sellerAddress: 'GAW24ZON4HHNOOO6SD33ZBZR6DNEFIRWJSIANJ5Q2CYTSC5UCQJEKKQC',
    status: 'proved',
    proof,
  })
  .onConflictDoUpdate({ target: orders.orderId, set: { proof, status: 'proved' } });

console.log('seeded order ZKP-1782946317542 with real proof');
process.exit(0);
