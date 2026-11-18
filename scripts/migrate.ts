import { Pool } from "pg";
import { applyMigrations, scopedConnectionString } from "../src/db/migrate";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to a PostgreSQL connection string.");
}

const pool = new Pool({
  connectionString: scopedConnectionString(databaseUrl, process.env.DATABASE_SCHEMA),
  max: 1,
});

async function main(): Promise<void> {
  try {
    const { applied, skipped } = await applyMigrations(pool);
    console.log(
      `Migrations applied: ${applied.length ? applied.join(", ") : "none"}. ` +
        `Already current: ${skipped.length ? skipped.join(", ") : "none"}.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
