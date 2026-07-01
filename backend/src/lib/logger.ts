import { pino } from 'pino';
import { env, isProd } from '../config/env.ts';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Pretty, colorized logs in dev; raw JSON in prod (for log shippers).
  transport: isProd
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
  base: undefined, // drop pid/hostname noise
});
