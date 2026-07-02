#!/usr/bin/env bash
# One-shot deterministic demo: seed a real zkTLS proof, lock USDC, settle on-chain.
# No live proving on the critical path — proving is proven separately (spikes/).
set -euo pipefail
cd "$(dirname "$0")/.."

PROOF="${1:-../spikes/pakasir-proof.json}"
API="${API:-http://localhost:4000}"

ORDER=$(node -e "const p=require('$PROOF');console.log(JSON.parse(p.claimData.context).extractedParameters.order_id)")
AMT=$(node -e "const p=require('$PROOF');console.log(JSON.parse(p.claimData.context).extractedParameters.amount)")

echo "▸ order $ORDER (Rp$AMT) — seeding real proof into DB"
bun scripts/seed-proof-order.ts "$PROOF" "$ORDER" "$AMT" >/dev/null

echo "▸ locking USDC on-chain (seller)…"
curl -s -X POST "$API/orders/$ORDER/lock" | node -e 'process.stdin.on("data",d=>{const o=JSON.parse(d);console.log("  lock tx:",o.hash||o.error)})' || true

echo "▸ settling — contract verifies proof on-chain & releases USDC…"
curl -s -X POST "$API/orders/$ORDER/settle/auto" | node -e 'process.stdin.on("data",d=>{const o=JSON.parse(d);if(o.hash){console.log("  ✅ SETTLED:",o.order.status);console.log("  tx: https://stellar.expert/explorer/testnet/tx/"+o.hash)}else console.log("  ",JSON.stringify(o))})'
