import "server-only";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, ensureDatabase } from "@/db/client";
import { auditEvents, companies, type Company } from "@/db/schema";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { ProjectActor } from "@/lib/project-service";

export const companySettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Company name must have at least 2 characters.")
    .max(120, "Company name must be no more than 120 characters."),
  countryCode: z.enum(["KE", "UG", "TZ", "RW", "US"]),
  currencyCode: z.enum(["KES", "UGX", "TZS", "RWF", "USD", "EUR", "GBP"]),
  timezone: z.enum([
    "Africa/Nairobi",
    "Africa/Kampala",
    "Africa/Dar_es_Salaam",
    "Africa/Kigali",
    "America/New_York",
    "UTC",
  ]),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

function assertPermission(actor: ProjectActor, permission: Permission): void {
  if (!hasPermission(actor.role, permission)) {
    throw new Error(`Role "${actor.role}" cannot perform ${permission}.`);
  }
}

export async function updateCompanySettings(
  actor: ProjectActor,
  input: CompanySettingsInput,
): Promise<Company | null> {
  assertPermission(actor, "settings:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [company] = await transaction
      .update(companies)
      .set({
        name: input.name,
        countryCode: input.countryCode,
        currencyCode: input.currencyCode,
        timezone: input.timezone,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, actor.companyId))
      .returning();
    if (!company) {
      return null;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "company.settings_updated",
      resourceType: "company",
      resourceId: company.id,
      metadata: {
        countryCode: company.countryCode,
        currencyCode: company.currencyCode,
        timezone: company.timezone,
      },
    });
    return company;
  });
}
