import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { memberships } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission, isMemberRole } from "@/lib/permissions";
import { getCheckoutStatus } from "@/lib/subscription-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const checkoutRequestId = new URL(request.url).searchParams.get(
    "checkoutRequestId",
  );
  if (!checkoutRequestId || !/^[A-Za-z0-9_-]{1,100}$/.test(checkoutRequestId)) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const rows = await db
    .select({ companyId: memberships.companyId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, session.user.id));
  const activeCompanyId = (await cookies()).get("jenganasi_active_company")?.value;
  const membership =
    rows.find((row) => row.companyId === activeCompanyId) ?? rows[0];
  if (
    !membership ||
    !isMemberRole(membership.role) ||
    !hasPermission(membership.role, "settings:update")
  ) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const payment = await getCheckoutStatus(
    { userId: session.user.id, companyId: membership.companyId, role: membership.role },
    checkoutRequestId,
  );
  if (!payment || payment.companyId !== membership.companyId) {
    return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  }

  return NextResponse.json({
    status: payment.status,
    resultCode: payment.resultCode,
    resultDesc: payment.resultDesc,
    receipt: payment.mpesaReceiptNumber,
  });
}
