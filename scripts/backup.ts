import { mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  requireDatabaseUrl,
  resolveBinary,
  runCommand,
  safeConnection,
  timestamp,
} from "./postgres-tools";

export type BackupResult = { path: string; bytes: number };

export function createBackup(file?: string): BackupResult {
  const path = file ?? join(".backups", `jenganasi-${timestamp()}.dump`);
  mkdirSync(dirname(path), { recursive: true });

  const connection = safeConnection(requireDatabaseUrl());
  runCommand(
    resolveBinary("pg_dump"),
    [
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      path,
      "--dbname",
      connection.url,
    ],
    connection.env,
  );

  return { path, bytes: statSync(path).size };
}

function main(): void {
  try {
    const result = createBackup(process.argv[2]);
    console.log(`Backup created: ${result.path} (${result.bytes} bytes)`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (require.main === module) main();
