import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const SENSITIVE_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "token",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
]);

function safePath(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitive = [...parsed.searchParams.keys()].some((key) =>
      SENSITIVE_KEYS.has(key.toLowerCase()),
    );
    return sensitive ? parsed.pathname : `${parsed.pathname}${parsed.search}`;
  } catch {
    return "unknown";
  }
}

export function proxy(request: NextRequest) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "request",
      requestId,
      method: request.method,
      path: safePath(request.url),
      ip: clientIp,
    }),
  );

  // The response body is not available here; completion is logged by each route
  // handler through the server-side logger. This line records dispatch only.
  void startedAt;
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
