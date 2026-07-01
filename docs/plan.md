# AnyRamp (Mayar Edition) — Riset & Plan: Smart Contract + Backend

> Produk: on-ramp fiat (IDR) → USDC di Stellar Soroban, pakai payment gateway **mayar.id**,
> dengan **zkTLS (Reclaim Protocol)** supaya identitas/PII buyer tidak bocor on-chain.
> Fokus tugas: **smart contract + backend**. Frontend/wallet di luar scope dokumen ini.

---

## 0. Verdict Kelayakan

**POSSIBLE — layak untuk MVP hackathon/prototipe.** Semua komponen kunci sudah ada hari ini:

| Komponen | Status | Bukti |
|---|---|---|
| Payment gateway IDR + QRIS + API status | ✅ Ada | mayar.id Headless API v2, Bearer auth, sandbox |
| zkTLS proof HTTPS response | ✅ Ada | Reclaim `zkFetch` (5–15 dtk proving) |
| Verifier ZK on-chain di Stellar | ✅ LIVE di testnet | Kontrak `CA4OZVT36RMBNI5MRDB4724N5LJ4H2FDA633UO2SH37DPLFRBXVBPNVT` |
| USDC native di Stellar | ✅ Ada | Circle USDC (testnet & mainnet) |

Risiko utama bukan "apakah bisa", tapi **detail integrasi** (lihat §6).

---

## 1. Data Hasil Riset

### 1.1 mayar.id (Headless API v2)
- **Auth:** `Authorization: Bearer <API_KEY>` (key dari https://web.mayar.id/api-keys). Ada sandbox.
- **Base URL:** `https://api.mayar.id/hl/v2/...`
- **Buat QRIS dinamis:** `POST /qr-codes/create` body `{ "amount": 10000 }`
  → response `{ data: { url: "<png qris>", amount } }`
  ⚠️ **Tidak** mengembalikan transaction id / order id → kurang cocok jadi sumber korelasi. **Pakai flow Invoice.**
- **Buat invoice:** `POST /hl/v1/invoice/create` (customer, amount, items, redirectUrl, expiredAt).
- **Detail/status invoice (endpoint yang akan di-zkFetch):** `GET /hl/v2/invoices/{id}`
  ```json
  { "statusCode":200, "data": {
      "id":"<uuid>", "amount":100000, "status":"paid|unpaid|closed",
      "transactionId":"<uuid>",
      "customer": { "name":"...", "email":"...", "mobile":"..." },  // PII — WAJIB DIREDAKSI
      "expiredAt": 1699999999000 } }
  ```
- **Webhook:** register `POST /hl/v2/webhooks/update` body `{ "urlHook": "<callback>" }`. (Struktur payload event belum terdokumentasi jelas → verifikasi manual di sandbox.)
- Ada `openapi.json` di `https://docs.mayar.id/api-reference/openapi.json` + `llms.txt` untuk indeks lengkap.

### 1.2 Reclaim Protocol di Stellar
- **Verifier terdeploy (testnet):** `CA4OZVT36RMBNI5MRDB4724N5LJ4H2FDA633UO2SH37DPLFRBXVBPNVT`.
- **Signature verifier (fakta, bukan tebakan):**
  ```rust
  pub fn verify_proof(message_digest: BytesN<32>, signature: BytesN<64>, recovery_id: u32)
      -> Result<(), ReclaimError>
  ```
  → Hanya secp256k1 recover + cek witness address. **Tidak** mem-parse field claim.
- Repo: `reclaimprotocol/stellar-sdk-onchain-integration` (kontrak), `reclaim-stellar-example` (dApp), `zkfetch-stellar-example`.
- SDK backend: `@reclaimprotocol/zkfetch` + `@reclaimprotocol/js-sdk`.

### 1.3 Implikasi arsitektur (PENTING)
Karena verifier hanya cek tanda tangan atas sebuah digest, **escrow contract kita** yang harus:
1. Terima claim data (URL/params/context berisi `status`,`amount`,`invoiceId`) sebagai argumen.
2. Rekonstruksi `message_digest` = keccak256(serialized claim) **on-chain**, persis format Reclaim.
3. Panggil `verify_proof(digest, sig, rec_id)` → kalau OK, witness benar-benar menandatangani claim itu.
4. Baru parse nilai dari claim (sekarang tepercaya) → cek `status=="paid"`, `amount>=expected`, cek nullifier `invoiceId`, lalu rilis USDC.

Ini beda dari doc deepseek yang mengasumsikan `proof.get_parameter(...)` on-chain — itu tidak ada.

---

## 2. Privasi: apa yang benar-benar disembunyikan

zkTLS **selective disclosure** → yang dibuktikan on-chain hanya field yang kita pilih via `responseMatches`:
- ✅ Dibuktikan: `status`, `amount`, `invoiceId` (dari respons TLS asli mayar).
- 🔒 Diredaksi: **API key** (di header/query) **dan PII buyer** (`customer.name/email/mobile`) — tidak masuk proof.
- 🔒 On-chain tidak pernah melihat tautan "siapa yang bayar IDR" ↔ "alamat Stellar penerima USDC".

**Batas privasi yang jujur (harus disampaikan ke user):**
- mayar.id sendiri tetap tahu identitas pembayar fiat (mereka yang proses QRIS). ZK menyembunyikan dari **rantai/publik**, bukan dari gateway.
- Alamat Stellar penerima tetap publik di ledger. Untuk anonimitas kuat butuh langkah tambahan (stealth address / relayer) — di luar MVP.
- Jadi klaim yang benar: **"pembayaran diverifikasi tanpa membocorkan PII/kredensial ke smart contract"**, bukan "anonim total".

---

## 3. Arsitektur Target

```
Buyer ──(1) minta on-ramp, kirim alamat Stellar──► Backend
Backend ──(2) create invoice mayar──► mayar.id ──► (QRIS/VA + invoiceId)
Buyer ──(3) bayar QRIS via app IDR──► mayar.id
mayar.id ──(4) webhook "paid"──► Backend            (TRIGGER saja, bukan bukti)
Backend ──(5) zkFetch GET /invoices/{id}──► mayar.id
        └─► Reclaim witness tandatangani claim {status,amount,invoiceId}, redaksi key+PII
Backend/Buyer ──(6) submit proof + claim data──► Escrow Contract (Soroban)
Escrow ──(7) rekonstruksi digest → verify_proof() via Reclaim verifier──► ✓
Escrow ──(8) cek status/amount/nullifier → transfer USDC──► alamat Stellar buyer
```

Webhook = trigger. **Bukti = ZK proof yang diverifikasi on-chain.**

---

## 4. Smart Contract (Soroban / Rust) — rencana

### Kontrak: `AnyRampEscrow`
Storage:
- `admin: Address`, `usdc: Address`, `reclaim_verifier: Address`
- `Order { id, buyer: Address, usdc_amount: i128, expected_idr: u64, status: Created|Funded|Fulfilled|Refunded, created_at }`
- `nullifiers: Map<invoiceId_hash, bool>` (anti double-spend)

Fungsi:
1. `initialize(admin, usdc, reclaim_verifier)`
2. `create_order(order_id, buyer, usdc_amount, expected_idr)` — dibuat saat backend bikin invoice.
3. `fund_order(order_id)` — LP/treasury depositkan USDC ke escrow (admin auth).
4. `fulfill_with_proof(order_id, claim_info, signed_claim, signature, recovery_id)`:
   - rekonstruksi `message_digest` dari `claim_info`+`signed_claim` (format Reclaim, keccak256).
   - `reclaim_verifier.verify_proof(digest, signature, recovery_id)` (cross-contract).
   - parse `context/params` → `status`, `amount`, `invoiceId` **HARUS** cocok dengan `order`.
   - assert `status=="paid"`, `amount>=expected_idr`, `!nullifier[invoiceId]`.
   - set nullifier, status=Fulfilled, `usdc.transfer(escrow → buyer, usdc_amount)`.
5. `refund(order_id)` — kalau expired/unpaid (admin/timeout).

Bagian tersulit & harus diverifikasi lebih dulu: **format serialisasi claim → digest** harus 1:1 dengan yang dipakai Reclaim (`stellar-sdk-onchain-integration` + contoh JS `createSignDataForClaim`). Bikin unit test dengan proof asli dari sandbox sebelum lanjut.

### Test kontrak
- Happy path dengan proof asli sandbox.
- Reject: signature salah, amount kurang, status unpaid, invoiceId sudah dipakai (nullifier), order tidak ada.

---

## 5. Backend (Node/TS) — rencana

Stack: TypeScript + Fastify/Express, SQLite (MVP), `@reclaimprotocol/zkfetch`, `@stellar/stellar-sdk`.

Modul:
- `adapters/mayar.ts` — `createInvoice()`, `getInvoice(id)`, `registerWebhook()`. Interface generik `PaymentProvider` biar bisa swap.
- `routes/orders.ts` — `POST /orders` (buat order + invoice, simpan mapping order↔invoice↔alamat Stellar), `GET /orders/:id`.
- `routes/webhook.ts` — terima webhook mayar → tandai `paid` → trigger prover.
- `services/zk-prover.ts` — `zkFetch(GET /hl/v2/invoices/{id})` dengan:
  - `responseMatches`: regex ambil `status`, `amount`, `id`.
  - `responseRedactions` / secret headers: redaksi `Authorization` (API key) + field `customer.*`.
- `services/stellar.ts` — submit `fulfill_with_proof` ke escrow, atau serahkan proof ke frontend untuk buyer submit sendiri (lebih trustless).
- `db/` — orders, nullifier log, webhook history.

Keputusan penting: **siapa submit proof?**
- MVP cepat: backend submit (butuh trust backend tidak sensor). 
- Lebih trustless: kirim proof ke frontend, buyer submit via Freighter. Rekomendasi: mulai backend-submit, sisakan jalur buyer-submit.

---

## 6. Open Questions / Risiko (diselesaikan sebelum coding)
1. **Format digest Reclaim** — samakan persis dgn repo onchain-integration (BLOKER kontrak).
2. **Bentuk payload webhook mayar** — belum jelas; verifikasi di sandbox + tanda tangan/secret.
3. **QRIS vs Invoice** — QRIS dinamis tak punya id; kemungkinan wajib pakai Invoice (punya `id`+`status`) sebagai sumber zkFetch. Konfirmasi endpoint mana yang stabil untuk QRIS-with-id.
4. **Reclaim di mainnet Stellar** — verifier terkonfirmasi hanya testnet; cek ketersediaan mainnet sebelum produksi.
5. **Likuiditas USDC** — siapa isi escrow? (treasury/LP). Model ekonomi di luar scope teknis tapi perlu diputuskan.
6. **Rate limit & sandbox mayar** — cek `rate-limit.md`, pastikan sandbox mengembalikan `status:"paid"` yg bisa disimulasikan.

---

## 7. Urutan Kerja yang Disarankan
1. Spike: dapatkan 1 proof asli dari `zkFetch` atas invoice sandbox mayar (buktikan `status`+`amount`+`id`, PII teredaksi).
2. Spike: verifikasi proof itu on-chain lewat verifier `CA4OZVT36...` (pakai contoh Reclaim) → pastikan digest cocok.
3. Bangun `AnyRampEscrow.fulfill_with_proof` + test dengan proof spike.
4. Bangun adapter mayar + endpoint order + webhook.
5. Sambungkan end-to-end di testnet.
6. Hardening: nullifier, refund/expiry, error handling.

> Sumber: docs.mayar.id (llms.txt, invoices/detail, qrcode, webhook), docs.reclaimprotocol.org/onchain/stellar, github reclaimprotocol/stellar-sdk-onchain-integration.

---

## 8. HASIL RISET SOURCE-CODE (terverifikasi dari repo asli — 2026-07)

Diverifikasi langsung dari `reclaimprotocol/stellar-sdk-onchain-integration` (kontrak) + `zkfetch-stellar-example` (JS + proof.json asli).

### 8.1 Apa yang benar-benar dilakukan `verify_proof` (deployed testnet)
```rust
pub fn verify_proof(env, message_digest: BytesN<32>, signature: BytesN<64>, recovery_id: u32)
    -> Result<(), ReclaimError>
```
- `secp256k1_recover(digest, sig, rec_id)` → pubkey → keccak256 → ambil 20 byte terakhir = ETH address.
- Cek address ada di set witness epoch aktif. Selesai. **Tidak** parse status/amount. Digest **dikirim dari luar.**
- Soroban punya `env.crypto().keccak256()` dan `env.crypto_hazmat().secp256k1_recover()` → semua primitif tersedia. ✅

### 8.2 Format digest (WAJIB direplikasi persis)
Dari `utils.js`:
```
serializedClaim = identifier + "\n" + owner + "\n" + timestampS + "\n" + epoch
digest = keccak256("\x19Ethereum Signed Message:\n" + serializedClaim.length + serializedClaim)
```
- `signature` = 64 byte (buang 2 hex terakhir = recovery byte). `recovery_id = last_byte - 27`.
- Witness default kontrak testnet: `0x244897572368eadf65bfbc5aec98d8e5443a9072` (attestor `wss://attestor.reclaimprotocol.org`).

### 8.3 ⚠️ TEMUAN KEAMANAN (mengubah desain kontrak)
`serializedClaim` hanya berisi `identifier, owner, timestampS, epoch` — **bukan** status/amount langsung.
Nilai `status`/`amount`/`orderId` ada di `claimData.context.extractedParameters`.
`identifier` = hash dari `ClaimInfo {provider, parameters, context}` (Reclaim `hashClaimInfo` = keccak256 dari `provider+"\n"+parameters+"\n"+context`).

**Contoh referensi Reclaim TIDAK memverifikasi ikatan identifier↔context** — dia cuma buktikan "ada proof valid". Untuk aplikasi uang, itu **tidak cukup**: penyerang bisa pakai signature valid tapi menyodorkan `context` palsu (amount digede-in) selama dia mengirim `identifier` yang cocok dengan signature — kecuali kontrak memaksa `identifier == hashClaimInfo(provider, parameters, context)` yang dibaca kontrak.

**Maka `AnyRampEscrow.fulfill_with_proof` HARUS (urutan wajib):**
1. Terima: `provider, parameters, context, owner, timestampS, epoch, signature(64), recovery_id`.
2. `computed_identifier = keccak256(provider + "\n" + parameters + "\n" + context)`.
3. `serialized = computed_identifier_hex + "\n" + owner + "\n" + timestampS + "\n" + epoch`.
4. `digest = keccak256(ethPrefix + len + serialized)`.
5. `reclaim_verifier.verify_proof(digest, signature, recovery_id)` (cross-contract) → witness sah.
6. Parse `extractedParameters` **dari `context` yang tadi di-hash** → `status`, `amount`, `orderId`.
7. Cek: `parameters.url` host == `api.mayar.id` (anti-provider-swap), `status=="paid"`, `amount>=expected_idr`, `orderId==order.invoice_id`, `!nullifier[orderId]`.
8. Set nullifier, rilis USDC.

Langkah 2 & 6 (parsing string on-chain di Soroban `no_std`) adalah bagian terberat → butuh util parsing byte manual.

**✅ SPIKE LULUS — JS & RUST (data `proof.json` asli):**
- JS: `IDENTIFIER MATCH: true`, `WITNESS MATCH: true`, recovery_id=1 (address ter-recover = attestor `0x2448...9072`).
- **Rust/Soroban `no_std`**: `identifier_matches_real_proof ✅`, `digest_matches_real_proof ✅` — digest hasil rekonstruksi = `0x7dae…b15c` (persis).
- Kode: `scratchpad/spike/digest-spike.mjs` + `anyramp/contracts/escrow/src/reclaim.rs` (`build_digest`, `compute_identifier` + test vector).
- **Sisa smart contract:** parser string `no_std` untuk ekstrak `status/amount/order_id` dari `context`, lalu escrow lifecycle + cross-contract call ke verifier Reclaim.

## 10. STATUS BUILD (repo `anyramp/`)
- Scaffold resmi `stellar contract init anyramp --name escrow` (soroban-sdk 26). `stellar-cli 27.0.0`.
- ✅ `reclaim.rs` — rekonstruksi digest TERBUKTI (2 test vs proof asli).
- ✅ `parse.rs` — context extractor (3 test).
- ✅ `lib.rs` — **AnyRampEscrow P2P** lengkap: `initialize`, `create_order` (seller lock USDC), `fulfill_with_proof` (buyer submit, verify via cross-contract ke Reclaim), `refund`, `get_order`.
- ✅ **13/13 test hijau** (happy path, invalid sig, amount too low, order mismatch, not completed, double-spend, refund/expiry, wrong provider host).
- ✅ **WASM ter-build**: `target/wasm32v1-none/release/escrow.wasm` (8.6KB) — deployable.

### Model yang diimplementasi (dipilih user)
- **P2P**: seller lock USDC per order (key = Pakasir `order_id`), buyer bayar IDR ke seller via Pakasir.
- **Buyer submit proof** sendiri (`buyer.require_auth()`), trustless, buyer bayar gas.
- Anti-fraud: digest binding (identifier↔context), cek `status=="completed"`, `amount>=expected_idr`, `order_id` & `project` match, host `app.pakasir.com`, status flip = anti double-spend.

### Sisa (belum)
1. Deploy escrow ke Stellar testnet + `initialize` (butuh akun testnet + address verifier Reclaim `CA4OZVT36...`).
2. E2E test dengan witness asli (perlu 1 proof Pakasir asli → butuh kredensial sandbox).
3. ~~**Backend**~~ ✅ SCAFFOLDED & SMOKE-TESTED (2026-07-02) — `anyramp/backend/` (TS, Node native, express):
   - `pakasir.ts` (create/simulate/cancel/detail — shapes real), `mock-pakasir.ts` (API palsu + webhook), `orders.ts` (lifecycle created→paid_detected→proving→proved→fulfilled), `server.ts` (REST + webhook), `zkprover.ts` (zkFetch dengan `{{apiKey}}` secret paramValues + `proofToContractArgs` → bentuk args `fulfill_with_proof`, split sig 65→64+recovery_id).
   - Smoke test mock LULUS: create → simulate → webhook → `paid_detected` → detail `completed`. `/prove` menunggu RECLAIM_APP_ID/SECRET.
   - Swap ke sandbox asli = ganti 3 env var saja.

### 8.4 Status tooling
- Node/Rust/wasm32 siap. `stellar-cli` sedang di-install via cargo.
- mayar sandbox: **by request** ke CS mayar (base `api.mayar.club`), status KYC belum pasti → pakai mock endpoint dulu, minta sandbox paralel.

---

## 9. KEPUTUSAN PROVIDER: GANTI KE PAKASIR (bukan mayar) — 2026-07

Alasan: mayar sandbox harus DM CS + KYC tak pasti. **Pakasir menang** untuk kasus ZK ini.

| Kriteria | mayar.id | **Pakasir** |
|---|---|---|
| Sandbox akses | by request (DM CS) | **self-service** (aktifkan di dashboard) |
| Simulasi bayar | tak jelas | **`POST /api/paymentsimulation`** (webhook instan, tanpa uang asli) |
| KYC untuk daftar | tak pasti | tidak disebut wajib |
| Response status | ada **PII buyer** (name/email/mobile) → wajib redaksi | **bersih**: cuma status/amount/order_id |
| Cocok utk zkFetch | ok tapi berisik | **ideal** |

### Endpoint kunci Pakasir (untuk implementasi)
- **Buat QRIS:** `POST https://app.pakasir.com/api/transactioncreate/qris`
  body `{ project, order_id, amount, api_key }` → `{ payment: { payment_number(QR string), total_payment, fee, expired_at, ... } }`
- **Simulasi bayar (sandbox):** `POST https://app.pakasir.com/api/paymentsimulation` (body sama) → memicu webhook `completed`.
- **Webhook (trigger):** POST ke URL kita, payload:
  `{ amount, order_id, project, status:"completed", payment_method:"qris", completed_at }`
- **Detail transaksi (INI yang di-zkFetch):**
  `GET https://app.pakasir.com/api/transactiondetail?project={slug}&amount={amt}&order_id={id}&api_key={KEY}`
  →
  ```json
  { "transaction": { "amount":22000, "order_id":"...", "project":"...",
      "status":"completed", "payment_method":"qris",
      "completed_at":"2024-09-10T08:07:02.819+07:00" } }
  ```
- **Kredensial:** daftar di `app.pakasir.com` → buat Project → dapat `slug` + `api_key`. Tanpa DM.

### Dampak ke desain (sederhana)
- **zkFetch target:** GET transactiondetail di atas. `responseMatches` → `status`,`amount`,`order_id`. **Redaksi `api_key`** (ada di query string).
- **Escrow contract** (§8.3) tetap sama, hanya konstanta: host `app.pakasir.com`, `extractedParameters` = `{status, amount, order_id}`. Tak ada PII → privasi on-chain makin bersih (order_id opaque).
- Batas privasi tetap: **Pakasir sendiri tahu pembayar fiat**; ZK menyembunyikan dari chain/publik + redaksi api_key.
- Kode zkFetch di doc deepseek (`09`/`08`) memang sudah menyasar endpoint Pakasir ini → bisa dipakai ulang.

> ~~`neticon pay`: tidak ditemukan dokumentasi API publik → dilewati.~~ (dikoreksi di §11)
> Mock endpoint spike tetap meniru bentuk `transactiondetail` Pakasir.

---

## 11. RISET LANJUTAN: neticon pay / UangX, KYC Pakasir, repo anyramp-glm — 2026-07-02

### 11.1 Neticon Pay H2H ≠ payment gateway (SALAH ARAH untuk on-ramp)
Dibedah langsung dari `https://m.neticonpay.my.id/h2h.html` (403 untuk fetcher biasa; berhasil dengan browser UA):
- H2H API Neticon = **API PPOB deposit-based** (beli pulsa/token PLN/game pakai saldo mitra). Endpoint tunggal `POST https://m.neticonpay.my.id/api/h2h/api.php`, actions: `profile|pricelist|order|status`, sign `md5(user_id+api_key+ref_id)`.
- Arahnya **keluar** (kita beli produk), bukan **masuk** (menerima pembayaran buyer) → **tidak cocok** untuk on-ramp.

### 11.2 UangX — payment gateway no-KYC dari grup yang sama (INI yang dimaksud Fajar)
- Portal: `https://uangx.neticonpay.my.id/` (PT Net Icon Pay Indonesia; klaim terdaftar OSS + PSE Komdigi).
- Terima **QRIS dinamis, VA, e-wallet**; API `createInvoice(order_id, nominal, pembeli)` → `payment_url`; webhook realtime; signature **SHA-256**.
- **Registrasi TANPA KYC/KTP**: form cuma nama bisnis + email + WhatsApp + password. Klaim "Bebas tarik kapan saja, 0% dana ditahan".
- **Sandbox simulator ada** (`/dashboard/sandbox.php`) + dokumentasi interaktif (`/dashboard/dokumentasi.php`) — **keduanya di balik login** (daftar gratis dulu).
- Risiko: operasi kecil (domain `.my.id`, halaman PHP) → pertimbangkan keandalan uptime/TLS untuk demo.

#### 11.2.b ✅ DITEST LIVE (2026-07-02, kredensial user: merchant `UANGX-E1C6AA`)
Semua endpoint jalan (signature SHA-256 plain concat):
- `POST /api/profile.php` `{merchant_code, signature=sha256(mc+key)}` → `{saldo_aktif, status_akun:"ACTIVE", ...}` ✅
- `POST /api/create_transaction.php` `{merchant_code, store_code, reference, amount, customer_name, signature=sha256(mc+ref+amount+key)}` → `{success, data:{payment_url, amount, reference}}` ✅
- `POST /api_cek_status.php` (form-urlencoded!) `{api_key, reference}` →
  `{status:"success", data:{reference, nominal_tagihan:10000, status_pembayaran:"PENDING|SUCCESS|PAID|EXPIRED|CANCELED", metode_pembayaran, tanggal_dibuat}}` ✅ tanpa PII
- GET ditolak ("Hanya menerima POST") → zkFetch harus POST; `api_key` di body form → sembunyikan via template `api_key={{apiKey}}&reference=...` + `paramValues` (pola persis contoh README zk-fetch).
- Webhook: `{merchant_code, reference, amount, status:"PAID", signature=sha256(mc+ref+amount+status+key)}`.

#### 11.2.c ⚠️ LUBANG KEAMANAN UangX untuk desain TRUSTLESS: tidak ada merchant binding
Response `api_cek_status.php` TIDAK memuat `merchant_code`/identitas merchant. Konsekuensi:
penyerang bisa daftar merchant UangX sendiri → buat transaksi dengan **reference yang sama** dengan order di escrow → bayar ke dirinya sendiri → dapat proof `status=SUCCESS, reference=X, nominal=Y` yang valid → klaim USDC **tanpa pernah membayar seller**. Kontrak tak bisa membedakan karena semua merchant memakai URL endpoint yang sama dan api_key-nya rahasia (tak masuk claim).
- **Pakasir tidak punya masalah ini**: response `transactiondetail` memuat `project` (slug, unik global) → kontrak pin `order.project`.
- UangX hanya layak jika: (a) responsnya nanti memuat merchant_code, atau (b) model trust dilonggarkan (proof co-sign backend — merusak narasi trustless).
- **Keputusan tetap: Pakasir PRIMARY; UangX = cadangan/uji UX pembayaran.**

### 11.3 KYC Pakasir — klaim Fajar vs docs resmi
Docs resmi `pakasir.com/p/docs` (update 22 Jun 2026) & pricing: **tidak ada sebutan KYC/KTP sama sekali**.
- Alur: daftar → buat Proyek → dapat `slug` + `api_key`. Proyek baru **"masih di mode Sandbox"** → `POST /api/paymentsimulation` untuk tes webhook tanpa uang asli.
- Interpretasi paling masuk akal atas "pakasir tetep butuh KYC" (Fajar): KYC kemungkinan diminta saat **keluar dari sandbox / go-live / penarikan dana riil** — bukan untuk daftar + sandbox.
- **Untuk hackathon (sandbox + simulasi) Pakasir tetap jalur utama.** Dana riil tidak dibutuhkan untuk demo.
- Endpoint tambahan terkonfirmasi: `POST /api/transactioncancel`; metode: qris + 8 macam VA; fee QRIS 0.7%+Rp310 (≤Rp105k) / 1% (di atasnya).

### 11.4 ✅ Solusi redaksi api_key di query string (verified dari README resmi zk-fetch v1.0.0)
Krusial karena kontrak kita mem-publish `parameters` on-chain:
- `privateOptions.headers` → header rahasia tidak masuk proof.
- **`privateOptions.paramValues` + template `{{key}}`** → nilai disubstitusi saat request, tapi proof/claim hanya memuat template-nya.
- Untuk Pakasir: `url = ".../api/transactiondetail?project=X&amount=Y&order_id=Z&api_key={{apiKey}}"`, `privateOptions.paramValues = { apiKey: "..." }` → on-chain `parameters` memuat `{{apiKey}}` literal, host check tetap jalan, key aman.
- ⚠️ Spike verifikasi tetap perlu: pastikan template di **URL** (bukan cuma body) didukung end-to-end dan identifier tetap konsisten.

### 11.5 Repo anyramp-glm
`github.com/ESES-Labs/anyramp-glm` **masih kosong** per 2026-07-02 dini hari (Fajar belum push). Re-check nanti; klaimnya redesign "on-chain ZK verification primary" — arsitektur kita (verify on-chain via kontrak Reclaim + digest binding) sudah persis itu.

### 11.6 Keputusan provider (updated)
| | Pakasir | UangX | mayar.id | Neticon H2H |
|---|---|---|---|---|
| Daftar tanpa KYC | ✅ (sandbox) | ✅ (klaim penuh) | ❌ perlu KYC | n/a |
| Sandbox self-service | ✅ terdokumentasi publik | ✅ (di balik login) | ❌ DM CS | n/a |
| Endpoint status utk zkFetch | ✅ **GET transactiondetail** (publik terdokumentasi) | ❓ belum terlihat | ✅ tapi ber-PII | ❌ bukan gateway |
| **Verdict** | **PRIMARY** | backup/cadangan menarik | drop | drop |

**Aksi:** tetap bangun di atas Pakasir (kontrak sudah hardcode host `app.pakasir.com`). Kalau mau evaluasi UangX serius: daftar gratis (email+WA), buka `dashboard/dokumentasi.php`, cari endpoint cek-status GET → kalau ada, tinggal ganti konstanta host + regex extractor.

### 11.7 Neticon "My Qris" H2H (`qris.neticonpay.my.id`) — PRODUCTION, real money, no sandbox — 2026-07-02
Produk ketiga Neticon: dompet QRIS pribadi (user sudah punya akun aktif, NMID `ID1020030040`). Docs `qris.neticonpay.my.id/docs/index.html` ("Production Ready"):
- Endpoint tunggal `POST https://qris.neticonpay.my.id/qris.php` (JSON):
  - `action:"request_deposit"` `{api_key, user_id, amount}` → `{result:true, trx_id:"H2H...", amount}`. Amount WAJIB + 3 digit kode unik (min Rp1.000). QR string digenerate client-side dari template QRIS statis "NETICON PAYMENT INDONESIA" (matching pembayaran = via nominal unik; dana masuk saldo My Qris).
  - `action:"check_status"` `{api_key, user_id, trx_id}` → `{result:true, status:"success"|"pending"|"expired"}` — response SANGAT minim (tanpa amount, tanpa echo trx_id).
- **Tidak ada sandbox** — tes = bayar beneran (min ~Rp1.000, murah untuk demo).
- **zkTLS fit (menarik!):** `user_id` (merchant) + `trx_id` ada di REQUEST body (bagian publik claim `parameters`) → merchant binding BISA di-verify on-chain dari `parameters`, bukan dari response. `trx_id` di-assign server Neticon (seller tak bisa dipalsukan pihak lain, api_key↔user_id divalidasi server).
- **Kompromi:** (1) amount TIDAK provable on-chain (tak ada di request/response check_status) → kontrak harus percaya seller mendaftarkan trx_id yang nominal tagihannya benar — aman secara insentif (seller yang butuh dibayar) tapi lebih lemah dari Pakasir; (2) IP Whitelist harus DIKOSONGKAN agar attestor Reclaim bisa akses; (3) response minim → responseMatches cuma `"status":"success"`.
- **Posisi:** kandidat jalur DEMO LIVE (uang asli, jalan hari ini, tanpa KYC), bukan pengganti Pakasir untuk pengembangan.

### 11.8 KYC Pakasir — TERKONFIRMASI dari dashboard user (2026-07-02)
User sudah daftar + submit KYC (status `in_review`, a.n. Muhammad Rifki). Fakta dari dashboard resmi:
- **Review KYC = 1–3 hari kerja**, TAPI **"Anda sudah bisa melakukan integrasi di mode Sandbox (percobaan)"** selama menunggu → **pengembangan TIDAK terblokir sama sekali**.
- Ada 2 level: KYC Pengguna + KYC Proyek. Sandbox tidak butuh keduanya.
- Kesimpulan: klaim "Pakasir butuh KYC" (Fajar) benar untuk produksi/pencairan, tapi hackathon path (sandbox) jalan hari ini.

### 11.10 ✅ SANDBOX PAKASIR ASLI DITEST LIVE (2026-07-02, project `anyramp`)
Kredensial: slug `anyramp` (project user, mode Sandbox aktif). Full loop LULUS — langsung ke API asli & via backend:
- `transactioncreate/qris` → 200, QR string sandbox, fee 1% (Rp1.500 utk Rp150k).
- `transactiondetail` sebelum bayar → `status:"pending"`; `paymentsimulation` → `{success:true}`; sesudah → `status:"completed"` + `completed_at`.
- Backend (`PAKASIR_BASE_URL=https://app.pakasir.com` di `.env`) → create/simulate/detail semua jalan tanpa perubahan kode. Webhook tidak sampai (localhost, belum ada URL publik) — tidak masalah, webhook cuma hint; jalur proof pakai `transactiondetail`.
- **TEMUAN: field `is_sandbox: true`** di response transactiondetail (tak terdokumentasi!). Hardening produksi nanti: kontrak/prover wajib menolak proof dengan `"is_sandbox":true` (tambah ke responseMatches + cek context). Untuk demo hackathon justru dipakai.
- Sisa jalur ZK: tinggal `RECLAIM_APP_ID`/`APP_SECRET` → `/orders/:id/prove` menghasilkan proof asli → verifikasi on-chain.

### 11.9 WD (pencairan) Neticon My Qris — tanpa KYC, tapi ada catatan
Dari TNC yang tertanam di app `qris.neticonpay.my.id` (diverifikasi 2026-07-02):
- **Tidak ada KYC/KTP** — registrasi cuma verifikasi email. Pencairan tidak menyebut syarat identitas.
- Fee penarikan **Rp 5.000 flat**; minimal penarikan otomatis **Rp 50.000**; masuk ke **E-Wallet** maksimal **3×24 jam kerja**; dana masuk lewat status "Dlm Kliring" dulu sebelum "Siap Tarik".
- ⚠️ Klausul risiko: PT Neticon Pay bisa **membekukan akun sepihak dan menghanguskan saldo** jika mendeteksi "indikasi pelanggaran". Untuk uang skala demo (puluhan ribu) risikonya sepele; jangan menimbun dana di sana.
