// SPIKE: real zkTLS proof over a real (sandbox) Pakasir payment.
// Creates a tx, simulates payment, then zkFetches transactiondetail with the
// api_key hidden via secret paramValues ({{apiKey}} URL template).
// Run from backend/: node scripts/zkfetch-spike.mjs
import 'dotenv/config';
import fs from 'node:fs';
import { ReclaimClient } from '@reclaimprotocol/zk-fetch';

const BASE = process.env.PAKASIR_BASE_URL;
const PROJECT = process.env.PAKASIR_PROJECT;
const KEY = process.env.PAKASIR_API_KEY;

const order_id = 'ZKP-' + Date.now();
const amount = 120000;

const post = (path, body) =>
  fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

console.log('[1] create sandbox tx', order_id);
await post('/api/transactioncreate/qris', { project: PROJECT, order_id, amount, api_key: KEY });
console.log('[2] simulate payment');
await post('/api/paymentsimulation', { project: PROJECT, order_id, amount, api_key: KEY });

// Deployed attestor caps redacted chars in the URL path (<32), so we can't hide
// the full 32-char api_key. Hide only the tail: 16 public + 16 secret chars
// still leaves ~95 bits of entropy secret.
const keyHead = KEY.slice(0, 16);
const keyTail = KEY.slice(16);
console.log(`[3] zkFetch transactiondetail (api_key tail hidden, ${keyTail.length} chars redacted)...`);
const client = new ReclaimClient(process.env.RECLAIM_APP_ID, process.env.RECLAIM_APP_SECRET);
const url =
  `${BASE}/api/transactiondetail?project=${PROJECT}&amount=${amount}` +
  `&order_id=${order_id}&api_key=${keyHead}{{apiKeyTail}}`;

const t0 = Date.now();
const useTee = process.argv.includes('--tee');
console.log('    mode:', useTee ? 'TEE' : 'zk (stwo)');
const proof = await client.zkFetch(
  url,
  { method: 'GET', ...(useTee ? { useTee: true } : {}) },
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
console.log(`    proof generated in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

fs.writeFileSync(new URL('../../spikes/pakasir-proof.json', import.meta.url), JSON.stringify(proof, null, 2));
console.log('[4] saved -> spikes/pakasir-proof.json');

const c = proof.claimData;
console.log('\n--- claimData ---');
console.log('provider  :', c.provider);
console.log('owner     :', c.owner, '| timestampS:', c.timestampS, '| epoch:', c.epoch);
console.log('identifier:', c.identifier);
console.log('parameters:', c.parameters.slice(0, 220), '...');
console.log('context   :', c.context.slice(0, 300), '...');
console.log('signatures:', proof.signatures);

// --- local security checks (same math the contract does) ---
const { ethers } = await import('ethers').catch(() => ({ ethers: null }));
if (ethers) {
  const serializedClaim = [c.identifier, c.owner, String(c.timestampS), String(c.epoch)].join('\n');
  const digest = ethers.hashMessage(serializedClaim);
  const recovered = ethers.recoverAddress(digest, proof.signatures[0]);
  const computedId = ethers.keccak256(
    ethers.toUtf8Bytes([c.provider, c.parameters, c.context].join('\n')),
  );
  console.log('\n--- verification ---');
  console.log('digest              :', digest);
  console.log('IDENTIFIER MATCH    :', computedId === c.identifier);
  console.log('recovered witness   :', recovered);
  console.log('WITNESS = attestor? :', recovered.toLowerCase() === '0x244897572368eadf65bfbc5aec98d8e5443a9072');
  const blob = JSON.stringify(proof);
  console.log('key tail leaked?    :', blob.includes(keyTail) ? '!!! LEAKED !!!' : 'NO (hidden)');
} else {
  console.log('\n(ethers not found — skip local recover check)');
  console.log('key tail leaked?:', JSON.stringify(proof).includes(keyTail) ? '!!! LEAKED !!!' : 'NO (hidden)');
}
