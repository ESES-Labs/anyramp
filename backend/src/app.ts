import { Hono } from 'hono';
import { pinoLogger } from 'hono-pino';
import { swaggerUI } from '@hono/swagger-ui';
import { logger } from './lib/logger.ts';
import { onError, notFound } from './middleware/error.ts';
import { openApiDoc } from './openapi.ts';
import { health } from './routes/health.ts';
import { orders } from './routes/orders.ts';
import { webhook } from './routes/webhook.ts';

export const app = new Hono();

app.use(pinoLogger({ pino: logger }));

// API docs: OpenAPI spec + Swagger UI at the root.
app.get('/openapi.json', (c) => c.json(openApiDoc));
app.get('/', swaggerUI({ url: '/openapi.json' }));

app.route('/health', health);
app.route('/orders', orders);
app.route('/webhook', webhook);

app.notFound(notFound);
app.onError(onError);
