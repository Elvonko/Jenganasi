import "server-only";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { scopedConnectionString, verifyMigrations } from "./migrate";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to a PostgreSQL connection string.");
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(databaseUrl);
} catch {
  throw new Error("DATABASE_URL is not a valid PostgreSQL connection string.");
}

if (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") {
  throw new Error("DATABASE_URL must use the postgres:// or postgresql:// scheme.");
}

const globalForDatabase = globalThis as typeof globalThis & {
  jengaPgPool?: Pool;
  jengaSchemaReady?: Promise<void>;
};

export const client =
  globalForDatabase.jengaPgPool ??
  new Pool({
    connectionString: scopedConnectionString(databaseUrl, process.env.DATABASE_SCHEMA),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.jengaPgPool = client;
}

export const db = drizzle(client, { schema });

export async function closeDatabase(): Promise<void> {
  await client.end();
  if (process.env.NODE_ENV !== "production") {
    delete globalForDatabase.jengaPgPool;
  }
  delete globalForDatabase.jengaSchemaReady;
}

export function ensureDatabase(): Promise<void> {
  globalForDatabase.jengaSchemaReady ??= verifyMigrations(client).catch((error) => {
    delete globalForDatabase.jengaSchemaReady;
    throw error;
  });

  return globalForDatabase.jengaSchemaReady;
}
