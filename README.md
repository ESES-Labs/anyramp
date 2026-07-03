# AnyRamp

**Pay in Rupiah. Get USDC. No trust required.**

Fiat (IDR) → USDC on-ramp on Stellar Soroban. A buyer pays via QRIS
([Pakasir](https://pakasir.com)); a self-hosted [Reclaim](https://reclaimprotocol.org)
attestor produces a **zkTLS proof** of that payment; the escrow contract verifies the proof
**on-chain** and releases USDC to the buyer's wallet — no backend trust, no PII on-chain.

## Layout

```
apps/
  frontend/    TanStack Start (React) — Vercel/Cloudflare
  backend/     Hono + Bun + Postgres + Drizzle; Swagger at /; on-chain submit + prover
  attestor/    Dockerfile only — builds the self-hosted Reclaim attestor
packages/
  sdk/               @anyramp/sdk — typed escrow client + proof mapping
  escrow-bindings/   generated contract bindings
contracts/     Rust Soroban escrow (initialize, create_order, fulfill_with_proof, refund)
deploy/        docker-compose.yml + .env.example (backend + attestor + postgres)
```

`apps/` = deployables · `packages/` = shared libs · `contracts/` = Rust · `deploy/` = infra.

## Quick start

**Whole API stack (Postgres + attestor + backend) via Docker:**

```bash
cd deploy && cp .env.example .env   # fill secrets — never commit .env
docker compose up -d --build        # backend on :4000 (Swagger at /)
```

**Or run the pieces for local dev:**

```bash
bun install                                    # workspace (run at repo root)

# backend — :4000
cd apps/backend && cp .env.example .env        # set PAKASIR_*, RECLAIM_*, ESCROW_CONTRACT_ID, SUBMITTER_SECRET, ATTESTOR_WS
bun run db:migrate
(cd prover && npm install)                     # isolated Reclaim prover (needs Node 20)
bun run dev

# frontend — :8080
cd apps/frontend && cp .env.example .env
bun run dev

# self-hosted attestor — :8001
docker build -t anyramp-attestor apps/attestor
docker run -d --name anyramp-attestor -e PRIVATE_KEY=<witness-key> -p 8001:8001 anyramp-attestor
```

Contract build/test: `cargo test` and `stellar contract build` in `contracts/`.

## The flow

1. `POST /orders` — issue a real QRIS via Pakasir; seller locks USDC on-chain (`/lock`).
2. Buyer pays the QRIS. The frontend polls `/orders/:id/settle-real`.
3. Payment confirmed via `transactiondetail` → the self-hosted attestor generates a zkTLS
   proof (~2s) → order becomes `proved`. (A server-side worker does this too, so settlement
   never depends on a browser tab.)
4. Buyer claims: a one-time USDC trustline + `/orders/:id/settle` → **sign in Freighter** →
   `/orders/:id/submit`. The escrow verifies the proof on-chain and releases USDC to the
   buyer's own wallet (or `/settle/auto` server-signed as a fallback).

## Security design (short)

The Reclaim verifier only checks a witness signature over a digest the *caller* supplies, so
the escrow itself recomputes `identifier = keccak256(provider \n parameters \n context)` and
the eth-signed-message digest from the raw claim parts before trusting any extracted value —
binding `status/amount/order_id/project` to the witness signature. It rejects `is_sandbox:true`
proofs unless `allow_sandbox` is set (dev/testnet only). See `contracts/escrow/src/reclaim.rs`.

The self-hosted attestor's witness is registered on the verifier via `add_epoch`; the api_key
is fully redacted inside the proof. Secrets live only in `.env` files (gitignored) — set them
in your host/Dokploy env panel (see `deploy/.env.example`).
