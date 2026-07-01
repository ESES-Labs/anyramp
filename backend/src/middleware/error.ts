import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../lib/logger.ts';

export function notFound(c: Context) {
  return c.json({ error: 'not_found', path: c.req.path }, 404);
}

export function onError(err: Error, c: Context) {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  logger.error({ err: err.message, stack: err.stack }, 'unhandled error');
  return c.json({ error: 'internal_error', message: err.message }, 500);
}
