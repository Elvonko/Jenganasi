"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, ensureDatabase } from "@/db/client";
import { auditEvents, companies, memberships } from "@/db/schema";
import { auth } from "@/lib/auth";

export type CompanyFormState = {
  error?: string;
};

const companySchema = z.object({
  name: z.string().trim().min(2, "Company name must have at least 2 characters.").max(120),
  currencyCode: z.enum(["KES", "UGX", "TZS", "RWF", "USD", "EUR", "GBP"]),
  countryCode: z.enum(["KE", "UG", "TZ", "RW", "US"]),
});

const regionalTimezones = {
  KE: "Africa/Nairobi",
  UG: "Africa/Kampala",
  TZ: "Africa/Dar_es_Salaam",
  RW: "Africa/Kigali",
  US: "America/New_York",
} as const;

export async function createCompany(
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    currencyCode: formData.get("currencyCode"),
    countryCode: formData.get("countryCode"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the company details.",
    };
  }

  await ensureDatabase();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const [existingMembership] = await db
    .select({ companyId: memberships.companyId })
    .from(memberships)
    .where(eq(memberships.userId, session.user.id))
    .limit(1);

  if (existingMembership) {
    const cookieStore = await cookies();
    cookieStore.set("jenganasi_active_company", existingMembership.companyId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect("/overview");
  }

  const companyId = randomUUID();
  const slugBase = parsed.data.name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const companySlug = `${slugBase || "company"}-${randomUUID().slice(0, 8)}`;

  await db.transaction(async (transaction) => {
    await transaction.insert(companies).values({
      id: companyId,
      name: parsed.data.name,
      slug: companySlug,
      countryCode: parsed.data.countryCode,
      currencyCode: parsed.data.currencyCode,
      timezone: regionalTimezones[parsed.data.countryCode],
    });
    await transaction.insert(memberships).values({
      id: randomUUID(),
      companyId,
      userId: session.user.id,
      role: "owner",
    });
    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId,
      actorUserId: session.user.id,
      action: "company.created",
      resourceType: "company",
      resourceId: companyId,
      metadata: {},
    });
  });

  const cookieStore = await cookies();
  cookieStore.set("jenganasi_active_company", companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/overview");
  redirect("/overview");
}
