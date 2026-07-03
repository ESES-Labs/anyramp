// Isolated Reclaim prover — run with Node 20 from this directory so the
// @reclaimprotocol native/github deps resolve correctly.
// Usage: node prove.mjs <orderId> <amount>   — prints the proof JSON to stdout.
//
// Two modes:
//  - ATTESTOR_WS set (e.g. ws://localhost:8001/ws): talk to our SELF-HOSTED attestor
//    directly via createClaimOnAttestor — fast, no public-attestor rate limits.
//    Its witness address must be registered on the verifier contract via add_epoch.
//  - otherwise: Reclaim's public attestor via zk-fetch (production trust model).
import WebSocket from 'ws';
// Node 20 has no global WebSocket (added in Node 22); attestor-core needs it.
globalThis.WebSocket ??= WebSocket;

const [, , orderId, amountStr] = process.argv;
const amount = Number(amountStr);
const {
  PAKASIR_BASE_URL,
  PAKASIR_PROJECT,
  PAKASIR_API_KEY,
  RECLAIM_APP_ID,
  RECLAIM_APP_SECRET,
  ATTESTOR_WS,
} = process.env;

if (!RECLAIM_APP_ID || !RECLAIM_APP_SECRET) {
  console.error('RECLAIM_APP_ID / RECLAIM_APP_SECRET not set');
  process.exit(1);
}

// Redaction of the api_key in the URL:
//  - self-hosted attestor (HTTP_MAX_REDACTIONS_IN_PATH raised): hide the FULL key.
//  - public attestor (caps redactions at 24): hide only the last 14 chars (~83 bits).
const TAIL = ATTESTOR_WS ? PAKASIR_API_KEY.length : 14;
const keyHead = PAKASIR_API_KEY.slice(0, PAKASIR_API_KEY.length - TAIL);
const keyTail = PAKASIR_API_KEY.slice(-TAIL);
const url =
  `${PAKASIR_BASE_URL}/api/transactiondetail` +
  `?project=${PAKASIR_PROJECT}&amount=${amount}&order_id=${orderId}&api_key=${keyHead}{{apiKeyTail}}`;

const responseMatches = [
  {
    type: 'regex',
    value:
      '"amount":(?<amount>[\\d]+),"order_id":"(?<order_id>[^"]+)","project":"(?<project>[^"]+)","status":"(?<status>[^"]+)"',
  },
  { type: 'regex', value: '"is_sandbox":(?<is_sandbox>true|false)' },
];

let proof;
if (ATTESTOR_WS) {
  // Same call shape zk-fetch uses internally, but pointed at our attestor.
  // attestor-core's `crypto` is a pluggable impl from @reclaimprotocol/tls that
  // MUST be initialised first (zk-fetch does this internally; direct calls must too).
  const { setCryptoImplementation } = await import('@reclaimprotocol/tls');
  const { webcryptoCrypto } = await import('@reclaimprotocol/tls/webcrypto');
  setCryptoImplementation(webcryptoCrypto);
  const { createClaimOnAttestor } = await import('@reclaimprotocol/attestor-core');
  const res = await createClaimOnAttestor({
    name: 'http',
    params: {
      method: 'GET',
      url,
      responseMatches,
      responseRedactions: [],
      body: '',
    },
    secretParams: { cookieStr: '', headers: {}, paramValues: { apiKeyTail: keyTail } },
    // gnark (native Go) redacts in ~0.5s; the stwo engine hangs on path redaction here.
    zkEngine: 'gnark',
    ownerPrivateKey: RECLAIM_APP_SECRET,
    client: { url: ATTESTOR_WS },
  });
  if (res.error) throw new Error(`attestor error: ${res.error.message}`);
  // Mirror zk-fetch's transformProof output shape.
  proof = {
    claimData: res.claim,
    identifier: res.claim.identifier,
    signatures: ['0x' + Buffer.from(res.signatures.claimSignature).toString('hex')],
    extractedParameterValues: JSON.parse(res.claim.context).extractedParameters,
    witnesses: [{ id: res.signatures.attestorAddress, url: ATTESTOR_WS }],
  };
} else {
  const { ReclaimClient } = await import('@reclaimprotocol/zk-fetch');
  const client = new ReclaimClient(RECLAIM_APP_ID, RECLAIM_APP_SECRET);
  proof = await client.zkFetch(
    url,
    { method: 'GET' },
    { paramValues: { apiKeyTail: keyTail }, responseMatches },
  );
}

// attestor-core logs to stdout; delimit the proof with a sentinel so the caller can
// pull it out cleanly. Then exit explicitly — the attestor WebSocket stays open and
// would otherwise keep the event loop alive, hanging this process forever.
process.stdout.write('\n__ANYRAMP_PROOF__' + JSON.stringify(proof), () => process.exit(0));
