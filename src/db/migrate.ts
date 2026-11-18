import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Pool, PoolClient } from "pg";

export const MIGRATIONS_DIRECTORY = join(process.cwd(), "src/db/migrations");

const ADVISORY_LOCK_ID = 731940215682;

const LEDGER_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    name text PRIMARY KEY,
    checksum text NOT NULL,
    status text NOT NULL CHECK (status IN ('success', 'failed')),
    error text,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

export type MigrationFile = {
  name: string;
  checksum: string;
  sql: string;
};

export function scopedConnectionString(
  connectionString: string,
  schema?: string,
): string {
  if (!schema) return connectionString;
  if (!/^[A-Za-z0-9_]+$/.test(schema)) {
    throw new Error("DATABASE_SCHEMA must contain only letters, digits and underscores.");
  }
  const url = new URL(connectionString);
  const existing = url.searchParams.get("options");
  url.searchParams.set(
    "options",
    `${existing ? `${existing} ` : ""}-c search_path=${schema}`,
  );
  return url.toString();
}

export type MigrationResult = {
  applied: string[];
  skipped: string[];
};

export async function readMigrationFiles(
  directory: string = MIGRATIONS_DIRECTORY,
): Promise<MigrationFile[]> {
  const names = (await readdir(/* turbopackIgnore: true */ directory))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(
        join(/* turbopackIgnore: true */ directory, name),
        "utf8",
      );
      return {
        name,
        checksum: createHash("sha256").update(sql).digest("hex"),
        sql,
      };
    }),
  );
}

async function getLedgerRow(
  pool: Pool | PoolClient,
  name: string,
): Promise<{ checksum: string; status: string } | null> {
  const result = await pool.query<{ checksum: string; status: string }>(
    "SELECT checksum, status FROM _migrations WHERE name = $1",
    [name],
  );
  return result.rows[0] ?? null;
}

export async function applyMigrations(
  pool: Pool,
  directory: string = MIGRATIONS_DIRECTORY,
): Promise<MigrationResult> {
  await pool.query(LEDGER_TABLE);

  const migrations = await readMigrationFiles(directory);
  const lock = await pool.connect();
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    await lock.query("SELECT pg_advisory_lock($1::bigint)", [ADVISORY_LOCK_ID]);

    for (const migration of migrations) {
      const existing = await getLedgerRow(lock, migration.name);
      if (existing) {
        if (existing.checksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.name} was modified after it was applied. ` +
              "Create a new migration instead of editing an applied one.",
          );
        }
        if (existing.status === "success") {
          skipped.push(migration.name);
          continue;
        }
        throw new Error(
          `Migration ${migration.name} previously failed. Investigate the error in ` +
            "_migrations and resolve it before retrying.",
        );
      }

      try {
        await lock.query("BEGIN");
        await lock.query(migration.sql);
        await lock.query(
          "INSERT INTO _migrations (name, checksum, status) VALUES ($1, $2, 'success')",
          [migration.name, migration.checksum],
        );
        await lock.query("COMMIT");
        applied.push(migration.name);
      } catch (error) {
        await lock.query("ROLLBACK");
        const message = error instanceof Error ? error.message : String(error);
        await lock.query(
          `INSERT INTO _migrations (name, checksum, status, error)
           VALUES ($1, $2, 'failed', $3)
           ON CONFLICT (name) DO UPDATE
             SET status = 'failed', error = EXCLUDED.error, applied_at = now()`,
          [migration.name, migration.checksum, message],
        );
        throw new Error(`Migration ${migration.name} failed: ${message}`);
      }
    }
  } finally {
    try {
      await lock.query("SELECT pg_advisory_unlock($1::bigint)", [ADVISORY_LOCK_ID]);
    } finally {
      lock.release();
    }
  }

  return { applied, skipped };
}

export async function verifyMigrations(
  pool: Pool,
  directory: string = MIGRATIONS_DIRECTORY,
): Promise<void> {
  const table = await pool.query<{ present: boolean }>(
    "SELECT to_regclass('_migrations') IS NOT NULL AS present",
  );
  if (!table.rows[0]?.present) {
    throw new Error(
      "Database migrations have not been applied. Run `npm run db:migrate` before starting the app.",
    );
  }

  const migrations = await readMigrationFiles(directory);
  for (const migration of migrations) {
    const row = await getLedgerRow(pool, migration.name);
    if (!row) {
      throw new Error(
        `Migration ${migration.name} has not been applied. Run \`npm run db:migrate\`.`,
      );
    }
    if (row.status !== "success") {
      throw new Error(
        `Migration ${migration.name} is marked ${row.status} in _migrations. Resolve it before starting the app.`,
      );
    }
    if (row.checksum !== migration.checksum) {
      throw new Error(
        `Migration ${migration.name} was modified after it was applied. Create a new migration instead.`,
      );
    }
  }
}
