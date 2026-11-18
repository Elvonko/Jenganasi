import { NextResponse } from "next/server";
import { client, ensureDatabase } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabase();
    await client.query("SELECT 1");
    return NextResponse.json({
      status: "ready",
      database: "ok",
      migrations: "ok",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unavailable",
        database: "error",
        migrations: "error",
        message:
          error instanceof Error && process.env.NODE_ENV !== "production"
            ? error.message
            : "Service is not ready. Check database connectivity and migration state.",
      },
      { status: 503 },
    );
  }
}
