import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;

function getDb(): DB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local for local dev, or to Vercel for production.'
    );
  }
  const client = postgres(url, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

// Lazy proxy: methods/props resolve to the real db on first access,
// not at import time. This keeps Next.js build-time module analysis
// from connecting (or throwing) before env vars are actually needed.
export const db = new Proxy({} as DB, {
  get(_, prop) {
    return Reflect.get(getDb(), prop);
  },
}) as DB;

export * from './schema';
