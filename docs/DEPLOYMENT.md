# AnyRamp — Testnet Deployment

**Network:** Stellar Testnet (`Test SDF Network ; September 2015`)
**Date:** 2026-07-02

## Contracts

| Contract | ID |
|---|---|
| **AnyRampEscrow** | `CC5C6GVYWTGFW47ETG22YUQLGFNFYRMOYXJG6NR4QRSZPFIWQIOIDIRK` |
| Reclaim verifier (own instance) | `CAHEWTDHSWRJOBUD2FZ4UDGVF7PFW53W6RZ2G3O57DONSKWKXIYSZGGQ` |
| Test USDC (Stellar Asset Contract) | `CCPJ56XM7KNWKJEGEGE3YZA55RSB7GF2DOT47DA2NTBJLYZBNMJD6XCL` |
| Admin / deployer | `GAW24ZON4HHNOOO6SD33ZBZR6DNEFIRWJSIANJ5Q2CYTSC5UCQJEKKQC` |

### Note on the Reclaim verifier
The canonical Reclaim testnet verifier `CA4OZVT36RMBNI5MRDB4724N5LJ4H2FDA633UO2SH37DPLFRBXVBPNVT`
is real but its persistent state (epoch/witness) was **archived** (Soroban state expiry),
so cross-contract `verify_proof` traps with `Storage/MissingValue`. We deployed our own
instance of the **same official Reclaim verifier contract**; its `instantiate` sets the
default witness to the real Reclaim attestor `0x244897572368eadf65bfbc5aec98d8e5443a9072`,
so it accepts genuine attestor signatures. (The canonical one can be used once its state is restored.)

## End-to-end proof (real zkTLS → on-chain settlement)

Using the real proof in [`spikes/pakasir-proof.json`](../spikes/pakasir-proof.json)
(a real Pakasir **sandbox** QRIS payment, order `ZKP-1782946317542`, Rp120.000):

1. `create_order` — seller locked 100,000,000 USDC. Escrow balance = 100,000,000.
2. `fulfill_with_proof` — contract reconstructed the digest on-chain (`0xc47abbb8…`),
   verified the witness signature via the Reclaim verifier, parsed `status=completed`,
   `amount=120000`, `order_id`, `project=anyramp` from `context`, checked all constraints,
   released USDC to the buyer.
3. Result: escrow balance = **0**, order status = **Fulfilled**.
   - tx: `5283367a74a797e3142006c9bfb6ae64062d766dce30f49fac32e6c74b18e5c0`

## Reproduce

```bash
# identity
stellar keys generate anyramp-deployer --network testnet --fund

# build + deploy escrow
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/escrow.wasm \
  --source anyramp-deployer --network testnet

# deploy + instantiate own Reclaim verifier (from reclaimprotocol/stellar-sdk-onchain-integration)
stellar contract deploy --wasm reclaim.wasm --source anyramp-deployer --network testnet
stellar contract invoke --id <VERIFIER> --source anyramp-deployer --network testnet -- \
  instantiate --user <DEPLOYER>

# init escrow
stellar contract invoke --id <ESCROW> --source anyramp-deployer --network testnet -- \
  initialize --admin <DEPLOYER> --usdc <USDC> --verifier <VERIFIER>
```
