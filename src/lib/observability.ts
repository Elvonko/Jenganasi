import "server-only";

import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "password",
  "newPassword",
  "currentPassword",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
  "passkey",
  "consumerkey",
  "consumersecret",
  "smtp_password",
  "database_url",
]);

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /\b(?:\+?254|0)\d{9}\b/g;
const TOKEN_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g;
const SAFE_KEYS = new Set(["requestId", "digest", "name"]);

function redactValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEYS.has(key.toLowerCase())) return "[REDACTED]";
  if (typeof value === "string") {
    if (key && SAFE_KEYS.has(key)) return value;
    return value
      .replace(EMAIL_PATTERN, "[EMAIL]")
      .replace(PHONE_PATTERN, "[PHONE]")
      .replace(TOKEN_PATTERN, "[TOKEN]");
  }
  if (value instanceof Error) {
    return { name: value.name, message: redactValue(value.message) };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactValue(childValue, childKey),
      ]),
    );
  }
  return value;
}

export function newRequestId(): string {
  return randomUUID();
}

let sentryReport: ((error: unknown, context?: Record<string, unknown>) => void) | null =
  null;

export function registerSentryReporter(
  reporter: (error: unknown, context?: Record<string, unknown>) => void,
): void {
  sentryReport = reporter;
}

function emit(
  level: LogLevel,
  message: string,
  context: Record<string, unknown> = {},
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: redactValue(message) as string,
    ...(redactValue(context) as Record<string, unknown>),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    emit("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    emit("warn", message, context);
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    emit("error", message, { ...context, ...(error ? { error } : {}) });
    if (error && sentryReport) {
      try {
        sentryReport(error, context);
      } catch {
        // Reporting must never break the request path.
      }
    }
  },
};
