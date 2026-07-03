import { app } from './app.ts';
import { env } from './config/env.ts';
import { logger } from './lib/logger.ts';
import { startSettlementWorker } from './services/settlement-worker.ts';

// idleTimeout covers on-chain submits (~10-30s); zkTLS proving runs in the
// background (see /prove) so it never holds a request open.
const server = Bun.serve({ port: env.PORT, fetch: app.fetch, idleTimeout: 120 });
logger.info(`anyramp backend on :${server.port} (pakasir: ${env.PAKASIR_BASE_URL})`);

// Sweep paid-but-unsettled orders so settlement never depends on a browser tab.
startSettlementWorker();
