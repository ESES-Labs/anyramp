// Probe the deployed attestor's URL redaction limit by shrinking the hidden
// api_key tail until a claim is accepted. Reuses an already-completed sandbox tx.
import 'dotenv/config';
import fs from 'node:fs';
import { ReclaimClient } from '@reclaimprotocol/zk-fetch';

const BASE = process.env.PAKASIR_BASE_URL;
const PROJECT = process.env.PAKASIR_PROJECT;
const KEY = process.env.PAKASIR_API_KEY;
const order_id = process.argv[2];
const amount = Number(process.argv[3]);
if (!order_id || !amount) throw new Error('usage: node redaction-probe.mjs <order_id> <amount>');

const client = new ReclaimClient(process.env.RECLAIM_APP_ID, process.env.RECLAIM_APP_SECRET);

for (const tailLen of [15, 14, 13, 12, 10, 8, 6]) {
  const keyHead = KEY.slice(0, KEY.length - tailLen);
  const keyTail = KEY.slice(KEY.length - tailLen);
  const url =
    `${BASE}/api/transactiondetail?project=${PROJECT}&amount=${amount}` +
    `&order_id=${order_id}&api_key=${keyHead}{{apiKeyTail}}`;
  process.stdout.write(`tail=${tailLen} ... `);
  try {
    const t0 = Date.now();
    const proof = await client.zkFetch(
      url,
      { method: 'GET' },
      {
        paramValues: { apiKeyTail: keyTail },
        responseMatches: [
          {
            type: 'regex',
            value:
              '"amount":(?<amount>[\\d]+),"order_id":"(?<order_id>[^"]+)","project":"(?<project>[^"]+)","status":"(?<status>[^"]+)"',
          },
          { type: 'regex', value: '"is_sandbox":(?<is_sandbox>true|false)' },
        ],
      },
    );
    console.log(`OK in ${((Date.now() - t0) / 1000).toFixed(1)}s — hidden ${tailLen} chars accepted`);
    fs.writeFileSync(new URL('../../spikes/pakasir-proof.json', import.meta.url), JSON.stringify(proof, null, 2));
    console.log('proof saved -> spikes/pakasir-proof.json');
    process.exit(0);
  } catch (e) {
    const m = String(e).match(/Too many redactions in URL path: (\d+)/);
    console.log(m ? `rejected (count ${m[1]})` : `error: ${String(e).slice(0, 140)}`);
  }
}
console.log('all tail lengths rejected');
process.exit(1);
