import "server-only";

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
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
    connectionString: databaseUrl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

const databaseSchema = process.env.DATABASE_SCHEMA;
if (databaseSchema) {
  if (!/^[A-Za-z0-9_]+$/.test(databaseSchema)) {
    throw new Error("DATABASE_SCHEMA must contain only letters, digits and underscores.");
  }
  client.on("connect", (connection) => {
    void connection.query(`SET search_path TO "${databaseSchema}"`).catch((error) => {
      connection.release(error as Error);
    });
  });
}

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
  globalForDatabase.jengaSchemaReady ??= (async () => {
    const migrationDirectory = join(process.cwd(), "src/db/migrations");
    const migrations = (await readdir(migrationDirectory))
      .filter((name) => /^\d+_.+\.sql$/.test(name))
      .sort();

    for (const migrationName of migrations) {
      const migration = await readFile(
        join(migrationDirectory, migrationName),
        "utf8",
      );
      const connection = await client.connect();
      try {
        await connection.query("BEGIN");
        await connection.query(migration);
        await connection.query("COMMIT");
      } catch (error) {
        await connection.query("ROLLBACK");
        throw new Error(
          `Database migration ${migrationName} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        connection.release();
      }
    }
  })().catch((error) => {
    delete globalForDatabase.jengaSchemaReady;
    throw error;
  });

  return globalForDatabase.jengaSchemaReady;
}
