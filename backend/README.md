# AnyRamp Backend

TypeScript backend (runs natively on Node ≥23, no build step) for the AnyRamp
fiat→USDC on-ramp: Pakasir adapter, order lifecycle, Reclaim zkFetch prover,
and contract-args shaping for `AnyRampEscrow.fulfill_with_proof`.

## Run (mock mode — no credentials needed)

```bash
cp .env.example .env
node src/mock-pakasir.ts &   # fake Pakasir API on :4990
node src/server.ts           # backend on :4000
```

Flow:

```bash
curl -X POST localhost:4000/orders -H 'Content-Type: application/json' \
  -d '{"orderId":"ORD-001","amountIdr":150000,"usdcAmount":"90000000","sellerAddress":"G..."}'
curl -X POST localhost:4000/orders/ORD-001/simulate   # sandbox payment -> webhook
curl localhost:4000/orders/ORD-001                    # status: paid_detected
curl localhost:4000/orders/ORD-001/detail             # cross-check vs transactiondetail
curl -X POST localhost:4000/orders/ORD-001/prove      # zkFetch proof (needs Reclaim creds)
```

## Switch to real Pakasir sandbox

Set in `.env`: `PAKASIR_BASE_URL=https://app.pakasir.com`, `PAKASIR_PROJECT=<slug>`,
`PAKASIR_API_KEY=<key>`. Same endpoints, zero code changes.

## Proof generation

`/orders/:id/prove` needs `RECLAIM_APP_ID` + `RECLAIM_APP_SECRET`
(free at https://dev.reclaimprotocol.org) and `npm install @reclaimprotocol/zk-fetch`.
The Pakasir `api_key` is injected via secret `paramValues` (`{{apiKey}}` template)
so it never appears in the proof or on-chain.
