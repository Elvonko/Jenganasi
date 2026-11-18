import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set to a PostgreSQL connection string.");
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// scheme.");
  }
  return url;
}

export function resolveBinary(name: string): string {
  const executable = process.platform === "win32" ? `${name}.exe` : name;
  const environmentKey = `${name.toUpperCase()}_PATH`;
  const explicit = process.env[environmentKey];
  if (explicit) return explicit;

  const binDirectory = process.env.PG_BIN_DIR;
  const candidates = [
    ...(binDirectory ? [join(binDirectory, executable)] : []),
    join(homedir(), "postgresql-17", "pgsql", "bin", executable),
    join(homedir(), "postgresql-17", "bin", executable),
    "C:\\Program Files\\PostgreSQL\\17\\bin\\" + executable,
    "/usr/bin/" + executable,
    "/usr/local/bin/" + executable,
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? executable;
}

export function safeConnection(url: string): {
  url: string;
  env: Record<string, string | undefined>;
} {
  const parsed = new URL(url);
  const password = parsed.password ? decodeURIComponent(parsed.password) : null;
  parsed.password = "";
  return {
    url: parsed.toString(),
    env: password ? { PGPASSWORD: password } : {},
  };
}

export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

export function adminUrl(url: string): string {
  return withDatabase(url, "postgres");
}

export function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function runCommand(
  command: string,
  args: string[],
  env: Record<string, string | undefined> = {},
): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} exited with ${result.status}:\n${result.stderr || result.stdout || ""}`,
    );
  }
  return result.stdout ?? "";
}
