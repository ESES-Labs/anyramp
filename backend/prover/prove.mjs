// Isolated Reclaim zkFetch prover — run with Node 20 from this directory so the
// @reclaimprotocol native/github deps resolve correctly.
// Usage: node prove.mjs <orderId> <amount>   — prints the proof JSON to stdout.
import WebSocket from 'ws';
// Node 20 has no global WebSocket (added in Node 22); attestor-core needs it.
globalThis.WebSocket ??= WebSocket;

import { ReclaimClient } from '@reclaimprotocol/zk-fetch';

const [, , orderId, amountStr] = process.argv;
const amount = Number(amountStr);
const { PAKASIR_BASE_URL, PAKASIR_PROJECT, PAKASIR_API_KEY, RECLAIM_APP_ID, RECLAIM_APP_SECRET } = process.env;

if (!RECLAIM_APP_ID || !RECLAIM_APP_SECRET) {
  console.error('RECLAIM_APP_ID / RECLAIM_APP_SECRET not set');
  process.exit(1);
}

const client = new ReclaimClient(RECLAIM_APP_ID, RECLAIM_APP_SECRET);

// Partial redaction: hide the last 14 chars of the api_key (~83 bits).
const TAIL = 14;
const keyHead = PAKASIR_API_KEY.slice(0, -TAIL);
const keyTail = PAKASIR_API_KEY.slice(-TAIL);
const url =
  `${PAKASIR_BASE_URL}/api/transactiondetail` +
  `?project=${PAKASIR_PROJECT}&amount=${amount}&order_id=${orderId}&api_key=${keyHead}{{apiKeyTail}}`;

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

process.stdout.write(JSON.stringify(proof));
