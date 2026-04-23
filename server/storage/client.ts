/**
 * Neon Postgres client. Uses the HTTP driver so it works in any serverless runtime
 * without requiring a persistent TCP connection.
 */

import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. See .env.example.');
}

export const sql = neon(process.env.DATABASE_URL);
