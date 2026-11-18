import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { Pool } from "pg";
import { after, before, test } from "node:test";
import {
  MIGRATIONS_DIRECTORY,
  applyMigrations,
  readMigrationFiles,
  scopedConnectionString,
  verifyMigrations,
} from "./migrate";

const baseDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const testSchema = `migrate_${randomUUID().replace(/-/g, "")}`;

let pool: Pool;

before(async () => {
  if (!baseDatabaseUrl) {
    throw new Error("Set DATABASE_URL (or TEST_DATABASE_URL) to run migration tests.");
  }
  const setup = new Pool({ connectionString: baseDatabaseUrl });
  try {
    await setup.query(`CREATE SCHEMA "${testSchema}"`);
  } finally {
    await setup.end();
  }

  pool = new Pool({
    connectionString: scopedConnectionString(baseDatabaseUrl, testSchema),
    max: 2,
  });
});

after(async () => {
  await pool?.end();
  if (baseDatabaseUrl) {
    const cleanup = new Pool({ connectionString: baseDatabaseUrl });
    try {
      await cleanup.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
    } finally {
      await cleanup.end();
    }
  }
});

test("migrations are tracked, idempotent and verifiable", async () => {
  await assert.rejects(verifyMigrations(pool), /have not been applied/);

  const expected = await readMigrationFiles();
  assert.ok(expected.length > 0);

  const first = await applyMigrations(pool);
  assert.equal(first.applied.length, expected.length);
  assert.equal(first.skipped.length, 0);

  const second = await applyMigrations(pool);
  assert.equal(second.applied.length, 0);
  assert.equal(second.skipped.length, expected.length);

  await verifyMigrations(pool);

  const ledger = await pool.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM _migrations WHERE status = 'success'",
  );
  assert.equal(ledger.rows[0]?.n, expected.length);
});

test("editing an applied migration is rejected", async () => {
  const directory = mkdtempSync(join(tmpdir(), "jenganasi-migrations-"));
  try {
    cpSync(MIGRATIONS_DIRECTORY, directory, { recursive: true });
    const last = (await readMigrationFiles(directory)).at(-1);
    assert.ok(last);
    writeFileSync(join(directory, last.name), `${last.sql}\n-- edited\n`);

    await assert.rejects(applyMigrations(pool, directory), /was modified after it was applied/);
    await verifyMigrations(pool);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
