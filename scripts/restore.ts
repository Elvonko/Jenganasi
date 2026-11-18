import { existsSync } from "node:fs";
import { Pool } from "pg";
import { verifyMigrations } from "../src/db/migrate";
import {
  adminUrl,
  requireDatabaseUrl,
  resolveBinary,
  runCommand,
  safeConnection,
  withDatabase,
} from "./postgres-tools";

export type RestoreResult = {
  database: string;
  tables: number;
  migrations: number;
};

async function verifyRestoredDatabase(url: string): Promise<RestoreResult> {
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await verifyMigrations(pool);
    const tables = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const migrations = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM _migrations WHERE status = 'success'",
    );
    return {
      database: new URL(url).pathname.slice(1),
      tables: tables.rows[0]?.n ?? 0,
      migrations: migrations.rows[0]?.n ?? 0,
    };
  } finally {
    await pool.end();
  }
}

export async function restoreToTempDatabase(file: string): Promise<RestoreResult> {
  const url = requireDatabaseUrl();
  if (!existsSync(file)) {
    throw new Error(`Backup file not found: ${file}`);
  }

  const database = `jenganasi_restore_${Date.now()}`;
  const admin = new Pool({ connectionString: adminUrl(url), max: 1 });
  await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();

  try {
    const targetUrl = withDatabase(url, database);
    const connection = safeConnection(targetUrl);
    runCommand(
      resolveBinary("pg_restore"),
      [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--dbname",
        connection.url,
        file,
      ],
      connection.env,
    );
    return await verifyRestoredDatabase(targetUrl);
  } finally {
    const cleanup = new Pool({ connectionString: adminUrl(url), max: 1 });
    try {
      await cleanup.query(`DROP DATABASE IF EXISTS "${database}"`);
    } finally {
      await cleanup.end();
    }
  }
}

export async function restoreInPlace(file: string): Promise<RestoreResult> {
  const url = requireDatabaseUrl();
  if (!existsSync(file)) {
    throw new Error(`Backup file not found: ${file}`);
  }

  const connection = safeConnection(url);
  runCommand(
    resolveBinary("pg_restore"),
    [
      "--format=custom",
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--dbname",
      connection.url,
      file,
    ],
    connection.env,
  );
  return verifyRestoredDatabase(url);
}

async function main(): Promise<void> {
  try {
    const file = process.argv[2];
    if (!file || file.startsWith("--")) {
      throw new Error("Usage: npm run db:restore -- <backup-file> [--replace --confirm]");
    }
    const replace = process.argv.includes("--replace");
    if (replace && !process.argv.includes("--confirm")) {
      throw new Error("In-place restore is destructive. Add --confirm to proceed.");
    }

    const result = replace
      ? await restoreInPlace(file)
      : await restoreToTempDatabase(file);
    console.log(
      `Restore verified: database=${result.database}, tables=${result.tables}, ` +
        `migrations=${result.migrations}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

void main();
