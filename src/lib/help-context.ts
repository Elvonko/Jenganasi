import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db, ensureDatabase } from "@/db/client";
import { memberships } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { HelpAudience } from "./help-content";

export async function getDefaultHelpAudience(): Promise<HelpAudience> {
  await ensureDatabase();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return "contractor";

  const rows = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, session.user.id));

  // A user with only client memberships sees the customer guide by default.
  if (rows.length > 0 && rows.every((row) => row.role === "client")) {
    return "customer";
  }
  return "contractor";
}

export async function isClientOnlyUser(): Promise<boolean> {
  await ensureDatabase();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return false;
  const rows = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, session.user.id)));
  return rows.length > 0 && rows.every((row) => row.role === "client");
}
