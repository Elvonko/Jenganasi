import "server-only";

// Optional Sentry hook. The package is not a hard dependency: install
// @sentry/node and set SENTRY_DSN to enable external error reporting.
// Structured logs remain the primary observability channel.
export async function initialiseErrorReporter(): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const moduleName = "@sentry/node";
    const Sentry = (await import(/* webpackIgnore: true */ moduleName)) as {
      init: (options: { dsn?: string; tracesSampleRate: number }) => void;
    };
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
  } catch {
    // Monitoring is best-effort and must never break startup.
  }
}
