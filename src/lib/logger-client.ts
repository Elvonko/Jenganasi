// Client-side logger: sends sanitised error reports to /api/telemetry without
// carrying page content or user input back to the server.
type ReportableError = Error & { digest?: string };

export const logger = {
  error(message: string, error?: ReportableError, context?: Record<string, unknown>): void {
    if (typeof navigator === "undefined") return;
    const body = JSON.stringify({
      message,
      name: error?.name,
      detail: error?.message?.slice(0, 500),
      digest: error?.digest,
      context,
    });
    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Telemetry must never interfere with the user's recovery options.
    });
  },
};
