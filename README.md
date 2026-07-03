# AnyRamp

**Trustless IDR → USDC on-ramp — verified by zkTLS on Stellar**

Pay in Rupiah. Get USDC. No trust required.

AnyRamp is a mobile-first P2P on-ramp for Indonesia. A buyer pays with **QRIS** (GoPay, DANA, or any e-wallet), a self-hosted **Reclaim** attestor produces a **zkTLS proof** of that payment, and a **Stellar Soroban escrow** verifies the proof **on-chain** before releasing USDC to the buyer's wallet — no backend trust, no PII on-chain.

> **Vision:** Trustless fiat-to-crypto for 270M+ QRIS users. Every settlement proven cryptographically, settled by smart contract — not platform promises.

---

## Why AnyRamp?

| | CEX | P2P | **AnyRamp** |
|---|---|---|---|
| Trust model | Trust the exchange | Trust a stranger | **Trust math (zk proof)** |
| Payment | Bank transfer, KYC | Manual, risky | **QRIS / e-wallet** |
| Settlement | Withdrawal queue | Hope they send | **On-chain escrow** |
| Privacy | Full KYC | Exposed in chat | **No PII on-chain** |

**The problem:** Getting USDC in Indonesia still means CEX friction, scammy P2P, or payment rails that don't connect to crypto.

**Our answer:** Bridge the payment methods people already use to USDC on Stellar — with zero-knowledge verification instead of blind faith.

---

## How it works

```
Buyer enters IDR  →  QRIS issued (Pakasir)
       ↓
Pays with GoPay / DANA / any e-wallet
       ↓
Self-hosted attestor generates zkTLS proof (~2s)
       ↓
Soroban escrow verifies proof on-chain  →  USDC → buyer wallet
```

### Step-by-step

1. **Create order** — Buyer enters IDR amount; backend issues a real QRIS via Pakasir; seller/LP locks USDC in the Soroban escrow.
2. **Pay** — Buyer scans and pays with any QRIS-compatible e-wallet.
3. **Prove** — Self-hosted Reclaim attestor generates a zkTLS proof. A backend worker also runs this, so settlement never depends on a browser tab.
4. **Claim** — Buyer signs the on-chain fulfill tx (Freighter or Privy embedded wallet). Escrow verifies the proof and releases USDC directly to the buyer.

---

## Product

### On-ramp (live on testnet)
- IDR → USDC via real QRIS payments
- End-to-end flow: order → pay → prove → settle
- Mobile-first UI built like a fintech app, not a DeFi dashboard

### Earn — liquidity pools
- LPs deposit **USDC** (on-ramp) or **XLM** (top-up) into public pools
- Configure max order size, spread markup, and accepted payment gateways
- Supported gateways: **GoPay, DANA Bisnis, Midtrans, Xendit, mayar.id, Pakasir**
- Earn yield on every order your pool fills

### Wallets
- **Privy embedded wallet** — email login, Stellar wallet auto-created, no seed phrase for new users
- **External wallets** — Freighter, xBull, Albedo, Lobstr via `@stellar/freighter-api`

---

## Tech stack

| Layer | Technology |
|---|---|
| **Smart contracts** | Rust · Stellar Soroban (testnet) |
| **Zero-knowledge** | [Reclaim Protocol](https://reclaimprotocol.org) zkTLS · self-hosted attestor |
| **Payments** | [Pakasir](https://pakasir.com) QRIS + Indonesian PG integrations |
| **Frontend** | TanStack Start · React · Tailwind CSS · Privy |
| **Backend** | Hono · Bun · Postgres · Drizzle · Swagger at `/` |
| **SDK** | `@anyramp/sdk` — typed escrow client + proof mapping |

### Architecture

```
apps/
  frontend/        TanStack Start (React) — Vercel / Cloudflare
  backend/         Hono + Bun + Postgres + Drizzle
  attestor/        Dockerfile — self-hosted Reclaim attestor
packages/
  sdk/             @anyramp/sdk — typed escrow client + proof mapping
  escrow-bindings/ Generated Soroban contract bindings
contracts/         Rust Soroban escrow (create_order, fulfill_with_proof, refund)
deploy/            docker-compose.yml + .env.example
```

---

## On-chain (Stellar testnet)

| | |
|---|---|
| **Network** | Stellar Testnet |
| **Passphrase** | `Test SDF Network ; September 2015` |
| **Soroban RPC** | `https://soroban-testnet.stellar.org` |
| **Horizon** | `https://horizon-testnet.stellar.org` |

### Deployed contracts

| Contract | ID | Explorer |
|---|---|---|
| **AnyRamp Escrow** | `CAS2EVVGSSKZADUTCHQESIXBDLTTIA3KEJYPPJXCQNAM5UJQGSISLBSB` | [View →](https://stellar.expert/explorer/testnet/contract/CAS2EVVGSSKZADUTCHQESIXBDLTTIA3KEJYPPJXCQNAM5UJQGSISLBSB) |
| **USDC (testnet SAC)** | `CCPJ56XM7KNWKJEGEGE3YZA55RSB7GF2DOT47DA2NTBJLYZBNMJD6XCL` | [View →](https://stellar.expert/explorer/testnet/contract/CCPJ56XM7KNWKJEGEGE3YZA55RSB7GF2DOT47DA2NTBJLYZBNMJD6XCL) |
| **Reclaim Verifier** | `CAHEWTDHSWRJOBUD2FZ4UDGVF7PFW53W6RZ2G3O57DONSKWKXIYSZGGQ` | [View →](https://stellar.expert/explorer/testnet/contract/CAHEWTDHSWRJOBUD2FZ4UDGVF7PFW53W6RZ2G3O57DONSKWKXIYSZGGQ) |

Set `ESCROW_CONTRACT_ID` / `USDC_CONTRACT_ID` / `RECLAIM_VERIFIER_ID` in `.env` (see `deploy/.env.example`).

### Escrow contract (`contracts/escrow`)

Rust Soroban contract — the settlement layer. Source: `contracts/escrow/src/lib.rs`.

| Function | Who calls | What it does |
|---|---|---|
| `initialize` | Admin (once) | Wire USDC token + Reclaim verifier address |
| `create_order` | Seller | Lock USDC against a Pakasir `order_id` + IDR amount + expiry |
| `fulfill_with_proof` | Buyer | Submit zkTLS proof → escrow verifies on-chain → USDC to buyer |
| `refund` | Seller | Reclaim locked USDC after expiry if order never fulfilled |
| `get_order` | Anyone | Read order state (Open / Fulfilled / Refunded) |

On-chain proof verification lives in `contracts/escrow/src/reclaim.rs` — the contract **reconstructs the Reclaim digest itself** from raw claim parts before calling the verifier (so a valid signature can't be paired with forged amount/order fields).

---

## zkTLS proof (Reclaim Protocol)

AnyRamp uses [Reclaim Protocol](https://reclaimprotocol.org) **zkTLS** to prove a Pakasir payment happened — without putting PII or API keys on-chain.

```
Buyer pays QRIS (Pakasir)
        ↓
Attestor TLS-sniffs payment confirmation (~2s)
        ↓
zkTLS proof generated (API keys redacted)
        ↓
Backend worker OR frontend submits proof
        ↓
Escrow recomputes digest + calls Reclaim verifier
        ↓
USDC released to buyer wallet
```

### What the proof attests

Extracted from the Pakasir payment response inside `claimData.context`:

| Field | Used for |
|---|---|
| `status` | Must be `completed` |
| `amount` | Must match order IDR |
| `order_id` | Must match escrow order key |
| `project` | Must match Pakasir project slug |

The escrow binds all four to the witness signature before releasing funds.

### Attestor (self-hosted)

| | |
|---|---|
| **Image** | `apps/attestor/Dockerfile` (pinned `attestor-core` commit) |
| **Port** | `8001` — WebSocket at `/ws` |
| **Witness ETH address** | `0x93f58be9dde2635e64538ec1d1be9a16cb03618c` |
| **Registration** | Witness must be registered on the Reclaim verifier via `add_epoch` |

```bash
docker build -t anyramp-attestor apps/attestor
docker run -d -p 8001:8001 -e PRIVATE_KEY=0x… anyramp-attestor
# backend: ATTESTOR_WS=ws://localhost:8001/ws
```

Reclaim app credentials (`RECLAIM_APP_ID`, `RECLAIM_APP_SECRET`) from [dev.reclaimprotocol.org](https://dev.reclaimprotocol.org). Leave `ATTESTOR_WS` empty to fall back to the public Reclaim attestor.

### Security guarantees

- **Digest reconstruction** — `identifier = keccak256(provider \n parameters \n context)` then Ethereum signed-message digest; escrow recomputes before trusting extracted values.
- **No PII on-chain** — Pakasir API keys fully redacted inside the proof.
- **Sandbox rejection** — Proofs with `is_sandbox: true` rejected unless `allow_sandbox` is set (testnet only).
- **Double-spend protection** — Order status flips to `Fulfilled` atomically with USDC transfer.
- **Fair for both sides** — Seller locks USDC first; buyer can't claim without valid proof; seller can't deny a proven payment.

See `contracts/escrow/src/reclaim.rs` and `packages/sdk/src/proof.ts` for proof mapping.

---

## What's shipped (MVP)

- [x] End-to-end on-ramp: QRIS → zkTLS proof → on-chain USDC release
- [x] Soroban escrow: create order, verify proof, refund
- [x] Self-hosted Reclaim attestor (Docker)
- [x] Seller liquidity pools with multi payment-gateway selection
- [x] Privy embedded wallet + Freighter / external wallet support
- [x] Mobile-first UI with Earn dashboard
- [x] Backend settlement worker (browser-independent)

---

## Quick start

### Full stack via Docker

```bash
cd deploy
cp .env.example .env          # fill secrets — never commit .env
docker network create dokploy-network  # only needed once on bare hosts
docker compose up -d --build  # backend :4000, attestor :8001, postgres :5432
```

Backend auto-applies DB migrations on startup. Manual migrate:

```bash
docker compose exec backend bun run db:migrate
```

### Local dev

```bash
bun install                                    # workspace (run at repo root)

# backend — :4000
cd apps/backend && cp .env.example .env        # PAKASIR_*, RECLAIM_*, ESCROW_CONTRACT_ID, SUBMITTER_SECRET, ATTESTOR_WS
bun run db:migrate
(cd prover && npm install)                     # isolated Reclaim prover (needs Node 20)
bun run dev

# frontend — :8080
cd apps/frontend && cp .env.example .env       # VITE_PRIVY_APP_ID
bun run dev

# self-hosted attestor — :8001
docker build -t anyramp-attestor apps/attestor
docker run -d --name anyramp-attestor -e PRIVATE_KEY=<witness-key> -p 8001:8001 anyramp-attestor
```

Contract build/test: `cargo test` and `stellar contract build` in `contracts/`.

---

## API

**Orders & settlement** — Swagger at `http://localhost:4000/`

```
POST /orders                         # create QRIS order + lock USDC
GET  /orders/:id                     # order status
POST /orders/:id/settle-real         # poll Pakasir → generate zk proof
POST /orders/:id/settle              # build fulfill tx (buyer signs)
POST /orders/:id/submit              # submit signed fulfill tx on-chain
POST /wallet/:address/fund           # testnet friendbot (dev only)
```

**Liquidity pools**

```
GET  /pools
GET  /pools/mine?sellerAddress=<address>
POST /pools
```

---

## Pitch & docs

- [`PITCH.md`](./PITCH.md) — 3-minute pitch script
- [`pitch-deck.html`](./pitch-deck.html) — standalone pitch deck (open in browser / print to PDF)

---

## License

MIT — see [LICENSE](./LICENSE) if present.
