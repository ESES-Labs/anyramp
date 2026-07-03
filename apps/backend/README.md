# AnyRamp Backend

Fiat→USDC on-ramp backend for AnyRamp. **Hono + Bun + Postgres (Drizzle) + Zod + pino.**

Pakasir adapter · order lifecycle (Postgres) · Reclaim zkFetch prover · contract-args
shaping for `AnyRampEscrow.fulfill_with_proof`.

## Stack

| Concern | Choice |
|---|---|
| Runtime | Bun |
| HTTP | Hono |
| DB | Postgres + Drizzle ORM (migrations) |
| Validation | Zod (`@hono/zod-validator`) |
| Logging | pino (`hono-pino`) |
| Config | Zod-validated env (fail-fast) |

## Layout

```
src/
  index.ts             Bun.serve entry
  app.ts               Hono app (middleware + routes)
  config/env.ts        Zod-validated environment
  lib/logger.ts        pino logger
  db/{schema,index}.ts Drizzle schema + client
  middleware/error.ts  onError + notFound
  routes/              health, orders, webhook
  services/            pakasir, zkprover, orders.service, mock-pakasir
drizzle/               generated migrations
docker-compose.yml     Postgres on :5433
```

## Run (mock mode — no credentials needed)

```bash
cp .env.example .env            # DATABASE_URL defaults to the docker pg on :5433
docker compose up -d            # Postgres
bun install
bun run db:migrate              # create tables

bun run mock                    # fake Pakasir on :4990
PAKASIR_BASE_URL=http://localhost:4990 PAKASIR_PROJECT=demo PAKASIR_API_KEY=dev-key bun run dev
```

Flow:

```bash
curl -X POST localhost:4000/orders -H 'Content-Type: application/json' \
  -d '{"orderId":"ORD-001","amountIdr":150000,"usdcAmount":"90000000","sellerAddress":"G..."}'
curl -X POST localhost:4000/orders/ORD-001/simulate   # sandbox payment -> webhook -> paid_detected
curl localhost:4000/orders/ORD-001                    # status
curl localhost:4000/orders/ORD-001/detail             # cross-check vs transactiondetail
curl -X POST localhost:4000/orders/ORD-001/prove      # zkFetch proof (needs Reclaim creds)
```

## Switch to real Pakasir sandbox

In `.env`: `PAKASIR_BASE_URL=https://app.pakasir.com`, `PAKASIR_PROJECT=<slug>`,
`PAKASIR_API_KEY=<key>`. Same endpoints, zero code changes.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health`, `/health/db` | liveness + DB ping |
| POST | `/orders` | seller intent → issue QRIS (Zod-validated) |
| GET | `/orders`, `/orders/:id` | list / fetch |
| GET | `/orders/:id/detail` | live `transactiondetail` cross-check |
| POST | `/orders/:id/simulate` | sandbox payment simulation |
| POST | `/orders/:id/prove` | zkFetch proof → `fulfill_with_proof` args |
| POST | `/webhook/pakasir` | payment hint → `paid_detected` |

## Scripts

`bun run dev` · `bun run start` · `bun run mock` · `bun run db:generate|migrate|studio` · `bun run typecheck`

## Notes

- Webhook is a **hint only**; the zkTLS proof over `transactiondetail` is the source of truth.
- `zkprover.ts` keeps the proven partial-redaction pattern (14-char api_key tail, ~83 bits)
  and `proofToContractArgs` (65→64-byte signature split + recovery_id).
- Production hardening: reject proofs carrying `is_sandbox:true`.
