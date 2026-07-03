import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { pinoLogger } from 'hono-pino';
import { swaggerUI } from '@hono/swagger-ui';
import { env } from './config/env.ts';
import { logger } from './lib/logger.ts';
import { onError, notFound } from './middleware/error.ts';
import { openApiDoc } from './openapi.ts';
import { health } from './routes/health.ts';
import { orders } from './routes/orders.ts';
import { wallet } from './routes/wallet.ts';
import { webhook } from './routes/webhook.ts';

export const app = new Hono();

app.use(pinoLogger({ pino: logger }));

// Restrict CORS to the configured frontend origin(s). Set CORS_ORIGIN to a comma-separated
// list of allowed origins in production; '*' (the default) only makes sense for local dev.
const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  '*',
  cors({ origin: corsOrigins.includes('*') ? '*' : corsOrigins }),
);

// API docs: OpenAPI spec + Swagger UI at the root.
app.get('/openapi.json', (c) => c.json(openApiDoc));
app.get('/', swaggerUI({ url: '/openapi.json' }));

app.route('/health', health);
app.route('/orders', orders);
app.route('/wallet', wallet);
app.route('/webhook', webhook);

app.notFound(notFound);
app.onError(onError);
