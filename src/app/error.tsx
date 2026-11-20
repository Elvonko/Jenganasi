"use client";

import Link from "next/link";
import { useEffect } from "react";
import { logger } from "@/lib/logger-client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("client error boundary", error, {
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card-heading">
          <p className="eyebrow">SOMETHING WENT WRONG</p>
          <h1>We couldn&apos;t load this page</h1>
          <p className="muted">
            The problem has been recorded. Try again, or contact your administrator
            with the reference below if it continues.
          </p>
        </div>
        {error.digest && (
          <p className="field-hint">Reference: <code>{error.digest}</code></p>
        )}
        <div className="form-stack">
          <button className="button button-primary" onClick={reset} type="button">
            Try again
          </button>
          <Link className="button button-secondary" href="/overview">
            Back to overview
          </Link>
        </div>
      </div>
    </main>
  );
}
