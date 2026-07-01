import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.ts';
import * as schema from './schema.ts';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
export { schema };
