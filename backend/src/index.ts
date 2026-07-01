import { app } from './app.ts';
import { env } from './config/env.ts';
import { logger } from './lib/logger.ts';

const server = Bun.serve({ port: env.PORT, fetch: app.fetch });
logger.info(`anyramp backend on :${server.port} (pakasir: ${env.PAKASIR_BASE_URL})`);
