import "server-only";

import { and, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, ensureDatabase } from "@/db/client";
import { companies, memberships } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission, isMemberRole, type Permission } from "@/lib/permissions";

const activeCompanyCookie = "jenganasi_active_company";

export async function getCompanyContext(permission?: Permission) {
  await ensureDatabase();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const rawMemberships = await db
    .select({
      companyId: memberships.companyId,
      role: memberships.role,
      companyName: companies.name,
      currencyCode: companies.currencyCode,
      countryCode: companies.countryCode,
      timezone: companies.timezone,
      planCode: companies.planCode,
    })
    .from(memberships)
    .innerJoin(companies, eq(memberships.companyId, companies.id))
    .where(eq(memberships.userId, session.user.id))
    .orderBy(memberships.createdAt);

  if (rawMemberships.length === 0) {
    redirect("/setup/company");
  }
  const membershipsForUser = rawMemberships.map((candidate) => {
    if (!isMemberRole(candidate.role)) {
      throw new Error("Company membership contains an unsupported role.");
    }
    return { ...candidate, role: candidate.role };
  });

  const cookieStore = await cookies();
  const requestedCompanyId = cookieStore.get(activeCompanyCookie)?.value;
  const membership =
    membershipsForUser.find(
      (candidate) => candidate.companyId === requestedCompanyId,
    ) ?? membershipsForUser[0];

  if (permission && !hasPermission(membership.role, permission)) {
    redirect("/forbidden");
  }

  return {
    actor: {
      userId: session.user.id,
      companyId: membership.companyId,
      role: membership.role,
    },
    company: {
      id: membership.companyId,
      name: membership.companyName,
      currencyCode: membership.currencyCode,
      countryCode: membership.countryCode,
      timezone: membership.timezone,
      planCode: membership.planCode,
    },
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    memberships: membershipsForUser,
  };
}

export async function getSessionUser() {
  await ensureDatabase();
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function switchActiveCompany(formData: FormData): Promise<void> {
  await ensureDatabase();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const companyId = formData.get("companyId");
  if (typeof companyId !== "string" || companyId.length === 0) {
    redirect("/forbidden");
  }

  const [membership] = await db
    .select({ companyId: memberships.companyId })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.companyId, companyId),
      ),
    )
    .limit(1);

  if (!membership) {
    redirect("/forbidden");
  }

  const cookieStore = await cookies();
  cookieStore.set(activeCompanyCookie, membership.companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/overview");
}
