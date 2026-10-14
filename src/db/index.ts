import { cache } from "react";
import { after } from "next/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * One database pool per HTTP request, shared by everything that runs during
 * that request (page renders, generateMetadata, route handlers).
 *
 * On Cloudflare Workers node-postgres talks over pg-cloudflare's socket, and a
 * socket frozen by the edge between requests can never be revived — reusing it
 * hangs the next request until the runtime gives up. A fresh pool per request
 * removes that entire failure class; React's `cache()` scopes it, Next's
 * `after()` retires it once the response has been sent.
 *
 * For higher traffic, create a Hyperdrive binding
 * (`npx wrangler hyperdrive create`) and hand its `connectionString` here
 * instead — pooled server-side, no per-request connections.
 */
const urlSslRequired = /sslmode=(?!disable)/.test(databaseUrl);

const getDb = cache(() => {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 3,
    connectionTimeoutMillis: 15_000,
    ...(urlSslRequired ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  try {
    after(() => {
      void pool.end().catch(() => {});
    });
  } catch {
    // Not inside a request (module init / tests) — nothing to schedule.
  }
  return drizzle(pool);
});

export { getDb };
