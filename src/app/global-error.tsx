"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial, sans-serif", padding: 40 }}>
        <h1>Something went wrong</h1>
        <p>The application could not load. Try again in a moment.</p>
        {error.digest && <p>Reference: {error.digest}</p>}
        <button onClick={reset} type="button">Try again</button>
      </body>
    </html>
  );
}
