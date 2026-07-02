# AnyRamp

**Pay in Rupiah. Get USDC. No trust required.**

Fiat (IDR) → USDC on-ramp on Stellar Soroban. A buyer pays a seller via QRIS
([Pakasir](https://pakasir.com)), then submits a **zkTLS proof** ([Reclaim
Protocol](https://reclaimprotocol.org)) of that payment to an escrow contract,
which verifies the proof **on-chain** and releases the seller's locked USDC —
no backend trust, no PII on-chain.

## Status (2026-07-02)

| Component | Status |
|---|---|
| `contracts/escrow` — P2P escrow + on-chain Reclaim digest reconstruction | ✅ 15/15 tests, WASM builds |
| `backend` — Hono + Bun + Postgres + Swagger | ✅ live-tested vs real Pakasir sandbox |
| Real zkTLS proof over a real sandbox payment | ✅ `spikes/pakasir-proof.json` (identifier + witness verified) |
| **Testnet deploy + on-chain fulfill** | ✅ escrow live, real proof settled (see `docs/DEPLOYMENT.md`) |
| Backend auto-submit + Freighter buyer submit | ✅ both paths |
| `frontend` — React + Freighter | ✅ |
| Live zkFetch prover | ✅ isolated npm/Node 20 package (`backend/prover/`) |

## Layout

```
contracts/escrow/  Soroban escrow (initialize, create_order, fulfill_with_proof, refund)
backend/           Hono+Bun+Postgres+Drizzle+Zod+pino; Swagger at /; on-chain submit
backend/prover/    Isolated Reclaim zkFetch prover (npm + Node 20)
frontend/          Vite+React+TS demo UI with Freighter
docs/              plan.md (research log), DEPLOYMENT.md (testnet addresses)
spikes/            PoC scripts + real proof artifacts
```

## Quick start

```bash
# 1. Backend (API docs at http://localhost:4000)
cd backend
cp .env.example .env               # set PAKASIR_*, RECLAIM_*, ESCROW_CONTRACT_ID, SUBMITTER_SECRET
docker compose up -d               # Postgres on :5433
bun install && bun run db:migrate
(cd prover && npm install)         # Reclaim prover deps (needs Node 20)
bun run dev

# 2. Frontend (http://localhost:5173)
cd ../frontend
cp .env.example .env
bun install && bun run dev
```

Contract build/test: `cd contracts && stellar contract build && cargo test`.

## The flow

1. `POST /orders` — seller registers an order, Pakasir issues a QRIS.
2. `POST /orders/:id/lock` — seller locks USDC into the escrow on-chain.
3. Buyer pays the QRIS (`/orders/:id/simulate` in sandbox).
4. `POST /orders/:id/prove` — Reclaim zkTLS proof over Pakasir `transactiondetail`
   (api_key partially redacted; buyer PII never present).
5. Buyer claims: `/orders/:id/settle` → **sign in Freighter** → `/orders/:id/submit`
   (or `/settle/auto` for a server-signed demo). Escrow verifies the proof on-chain
   and releases USDC.

## Security design (short version)

The deployed Reclaim verifier on Stellar only checks a witness signature over a
digest that the *caller* supplies. So the escrow contract itself recomputes
`identifier = keccak256(provider \n parameters \n context)` and the
eth-signed-message digest from the raw claim parts before trusting any extracted
value — binding `status/amount/order_id/project` to the witness signature. It also
rejects `is_sandbox:true` proofs unless `allow_sandbox` is set (dev/testnet only).
See `contracts/escrow/src/reclaim.rs` and `docs/plan.md` §8.3.

Secrets: real keys live only in `backend/.env` (gitignored).
