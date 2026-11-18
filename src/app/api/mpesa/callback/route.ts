import { NextResponse } from "next/server";
import { MpesaClient, mpesaConfigFromEnv } from "@/lib/mpesa/client";
import {
  applyMpesaCallback,
  type MpesaCallback,
} from "@/lib/subscription-service";

export const dynamic = "force-dynamic";

function optionalClient(): MpesaClient | null {
  try {
    return new MpesaClient(mpesaConfigFromEnv());
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && !optionalClient()) {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "M-Pesa is not configured." },
      { status: 503 },
    );
  }

  try {
    const payload = (await request.json()) as MpesaCallback;
    await applyMpesaCallback(payload, optionalClient());
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback failed", error);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Callback could not be processed." },
      { status: 500 },
    );
  }
}
