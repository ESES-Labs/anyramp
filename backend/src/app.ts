import { Hono } from 'hono';
import { pinoLogger } from 'hono-pino';
import { logger } from './lib/logger.ts';
import { onError, notFound } from './middleware/error.ts';
import { health } from './routes/health.ts';
import { orders } from './routes/orders.ts';
import { webhook } from './routes/webhook.ts';

export const app = new Hono();

app.use(pinoLogger({ pino: logger }));

app.route('/health', health);
app.route('/orders', orders);
app.route('/webhook', webhook);

app.notFound(notFound);
app.onError(onError);
