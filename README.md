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
| `contracts/escrow` — P2P escrow + on-chain Reclaim digest reconstruction | ✅ 13/13 tests, WASM builds |
| `backend` — Pakasir adapter, order lifecycle, zkFetch prover | ✅ live-tested vs real sandbox |
| Real zkTLS proof over a real sandbox payment | ✅ `spikes/pakasir-proof.json` (identifier + witness verified) |
| Testnet deploy + on-chain fulfill | ⏳ next |
| Frontend | ⏳ |

## Layout

- `contracts/escrow/` — Soroban contract: `initialize`, `create_order` (seller locks USDC),
  `fulfill_with_proof` (buyer submits Reclaim claim parts; contract recomputes the claim
  identifier & digest, calls the deployed Reclaim verifier, checks
  status/amount/order_id/project, releases USDC), `refund`.
- `backend/` — TypeScript (Node ≥23, no build step). See `backend/README.md`.
- `docs/plan.md` — full research log & architecture decisions.
- `docs/research/` — raw provider research (Pakasir, UangX, Neticon My Qris).
- `spikes/` — proof-of-concept scripts + real proof artifacts.

## Security design (short version)

The deployed Reclaim verifier on Stellar only checks a witness signature over a
digest that the *caller* supplies. So the escrow contract itself recomputes
`identifier = keccak256(provider \n parameters \n context)` and the
eth-signed-message digest from the raw claim parts before trusting any
extracted value — binding `status/amount/order_id/project` to the witness
signature. See `contracts/escrow/src/reclaim.rs` and `docs/plan.md` §8.3.

Secrets: real keys live only in `backend/.env` (gitignored).
