import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.slice(0, 200) : "client error";
  const context: Record<string, unknown> = {
    name: typeof body.name === "string" ? body.name.slice(0, 100) : undefined,
    digest: typeof body.digest === "string" ? body.digest.slice(0, 100) : undefined,
    requestId: (await headers()).get("x-request-id"),
  };
  logger.error(message, undefined, context);
  return new NextResponse(null, { status: 204 });
}
