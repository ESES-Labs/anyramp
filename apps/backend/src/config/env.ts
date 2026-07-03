// Fail-fast, type-safe environment. Bun auto-loads .env, so we validate Bun.env
// once at import time; any missing/invalid var crashes the process immediately.
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Comma-separated list of allowed browser origins. '*' is dev-only.
  CORS_ORIGIN: z.string().default('*'),

  DATABASE_URL: z.string().url(),

  PAKASIR_BASE_URL: z.string().url().default('https://app.pakasir.com'),
  PAKASIR_PROJECT: z.string().default(''),
  PAKASIR_API_KEY: z.string().default(''),

  RECLAIM_APP_ID: z.string().default(''),
  RECLAIM_APP_SECRET: z.string().default(''),

  ESCROW_CONTRACT_ID: z.string().default(''),
  USDC_CONTRACT_ID: z.string().default('CCPJ56XM7KNWKJEGEGE3YZA55RSB7GF2DOT47DA2NTBJLYZBNMJD6XCL'),
  RECLAIM_VERIFIER_ID: z.string().default('CAHEWTDHSWRJOBUD2FZ4UDGVF7PFW53W6RZ2G3O57DONSKWKXIYSZGGQ'),
  SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),
  // Server key that submits create_order/fulfill txs (also the demo/embedded settle buyer).
  SUBMITTER_SECRET: z.string().default(''),
  // Self-hosted Reclaim attestor WS endpoint (wss://… in prod). Empty => public attestor.
  ATTESTOR_WS: z.string().default(''),
  // Node binary used to run the isolated Reclaim prover (needs Node 20). '' => 'node'.
  PROVE_NODE_BIN: z.string().default(''),

  // Background settlement worker: sweeps paid-but-unsettled orders so settlement never
  // depends on a browser tab staying open. Disable only for tests.
  ENABLE_SETTLEMENT_WORKER: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  SETTLEMENT_POLL_MS: z.coerce.number().int().positive().default(20_000),
});

const parsed = schema.safeParse(Bun.env);
if (!parsed.success) {
  console.error('❌ Invalid environment:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
