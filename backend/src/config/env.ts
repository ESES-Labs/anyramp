// Fail-fast, type-safe environment. Bun auto-loads .env, so we validate Bun.env
// once at import time; any missing/invalid var crashes the process immediately.
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),

  PAKASIR_BASE_URL: z.string().url().default('https://app.pakasir.com'),
  PAKASIR_PROJECT: z.string().default(''),
  PAKASIR_API_KEY: z.string().default(''),

  RECLAIM_APP_ID: z.string().default(''),
  RECLAIM_APP_SECRET: z.string().default(''),

  ESCROW_CONTRACT_ID: z.string().default(''),
  SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),
  // Optional server key for the demo auto-submit path (buyer == submitter).
  SUBMITTER_SECRET: z.string().default(''),

  MOCK_PORT: z.coerce.number().int().positive().default(4990),
  WEBHOOK_URL: z.string().url().default('http://localhost:4000/webhook/pakasir'),
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
