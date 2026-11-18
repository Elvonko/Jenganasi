import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, ensureDatabase } from "@/db/client";
import {
  auditEvents,
  companyTemplates,
  type CompanyTemplate,
  type EstimateTemplateData,
  type ProjectTemplateData,
} from "@/db/schema";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { ProjectActor } from "@/lib/project-service";

export const projectTemplateDataSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(120),
        description: z.string().trim().max(500).default(""),
      }),
    )
    .max(30, "Project templates can include at most 30 tasks."),
  milestones: z
    .array(z.object({ title: z.string().trim().min(3).max(120) }))
    .max(30, "Project templates can include at most 30 milestones."),
});

export const estimateTemplateDataSchema = z.object({
  lineItems: z
    .array(
      z.object({
        category: z.enum([
          "materials",
          "labour",
          "equipment",
          "subcontract",
          "other",
        ]),
        description: z.string().trim().min(2).max(180),
        unit: z.string().trim().min(1).max(24),
        quantity: z.number().finite().positive().multipleOf(0.001).max(999_999_999),
        unitRate: z.number().finite().nonnegative().multipleOf(0.01).max(999_999_999_999),
      }),
    )
    .min(1, "An estimate template needs at least one cost item.")
    .max(50, "Estimate templates can include at most 50 cost items."),
});

export const companyTemplateInputSchema = z.discriminatedUnion(
  "templateType",
  [
    z.object({
      templateType: z.literal("project"),
      name: z.string().trim().min(2).max(120),
      data: projectTemplateDataSchema,
    }),
    z.object({
      templateType: z.literal("estimate"),
      name: z.string().trim().min(2).max(120),
      data: estimateTemplateDataSchema,
    }),
  ],
);

export type ProjectTemplateRecord = Omit<
  CompanyTemplate,
  "templateType" | "data"
> & {
  templateType: "project";
  data: ProjectTemplateData;
};

export type EstimateTemplateRecord = Omit<
  CompanyTemplate,
  "templateType" | "data"
> & {
  templateType: "estimate";
  data: EstimateTemplateData;
};

export type CompanyTemplateRecord =
  | ProjectTemplateRecord
  | EstimateTemplateRecord;

export type CompanyTemplateInput = z.infer<typeof companyTemplateInputSchema>;

export class DuplicateCompanyTemplateError extends Error {
  constructor() {
    super("A template with this name already exists.");
    this.name = "DuplicateCompanyTemplateError";
  }
}

function assertPermission(actor: ProjectActor, permission: Permission): void {
  if (!hasPermission(actor.role, permission)) {
    throw new Error(`Role "${actor.role}" cannot perform ${permission}.`);
  }
}

function parseTemplateData(row: CompanyTemplate): CompanyTemplateRecord {
  if (row.templateType === "project") {
    const parsed = projectTemplateDataSchema.safeParse(row.data);
    if (!parsed.success) {
      throw new Error(`Project template "${row.id}" contains invalid data.`);
    }
    return {
      ...row,
      templateType: "project",
      data: parsed.data,
    };
  }
  if (row.templateType === "estimate") {
    const parsed = estimateTemplateDataSchema.safeParse(row.data);
    if (!parsed.success) {
      throw new Error(`Estimate template "${row.id}" contains invalid data.`);
    }
    return {
      ...row,
      templateType: "estimate",
      data: parsed.data,
    };
  }
  throw new Error(`Company template "${row.id}" has an unsupported type.`);
}

export async function listCompanyTemplates(
  actor: ProjectActor,
): Promise<CompanyTemplateRecord[]> {
  assertPermission(actor, "settings:read");
  await ensureDatabase();
  const rows = await db
    .select()
    .from(companyTemplates)
    .where(eq(companyTemplates.companyId, actor.companyId))
    .orderBy(asc(companyTemplates.templateType), asc(companyTemplates.name));
  return rows.map(parseTemplateData);
}

export async function getCompanyTemplate(
  actor: ProjectActor,
  templateId: string,
  templateType: "project" | "estimate",
): Promise<CompanyTemplateRecord | null> {
  assertPermission(actor, "settings:read");
  await ensureDatabase();
  const [row] = await db
    .select()
    .from(companyTemplates)
    .where(
      and(
        eq(companyTemplates.id, templateId),
        eq(companyTemplates.companyId, actor.companyId),
        eq(companyTemplates.templateType, templateType),
      ),
    )
    .limit(1);
  return row ? parseTemplateData(row) : null;
}

export async function createCompanyTemplate(
  actor: ProjectActor,
  input: CompanyTemplateInput,
): Promise<CompanyTemplateRecord> {
  assertPermission(actor, "settings:update");
  await ensureDatabase();
  const parsedInput = companyTemplateInputSchema.parse(input);

  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select({ id: companyTemplates.id })
      .from(companyTemplates)
      .where(
        and(
          eq(companyTemplates.companyId, actor.companyId),
          eq(companyTemplates.templateType, parsedInput.templateType),
          eq(companyTemplates.name, parsedInput.name),
        ),
      )
      .limit(1);
    if (existing) {
      throw new DuplicateCompanyTemplateError();
    }

    const [template] = await transaction
      .insert(companyTemplates)
      .values({
        id: randomUUID(),
        companyId: actor.companyId,
        templateType: parsedInput.templateType,
        name: parsedInput.name,
        data: parsedInput.data,
        createdBy: actor.userId,
      })
      .returning();
    if (!template) {
      throw new Error("Template creation did not return a saved template.");
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: `company.${parsedInput.templateType}_template.created`,
      resourceType: "company_template",
      resourceId: template.id,
      metadata: {
        templateType: parsedInput.templateType,
        name: parsedInput.name,
      },
    });
    return parseTemplateData(template);
  });
}

export async function deleteCompanyTemplate(
  actor: ProjectActor,
  templateId: string,
): Promise<boolean> {
  assertPermission(actor, "settings:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [template] = await transaction
      .delete(companyTemplates)
      .where(
        and(
          eq(companyTemplates.id, templateId),
          eq(companyTemplates.companyId, actor.companyId),
        ),
      )
      .returning({
        id: companyTemplates.id,
        templateType: companyTemplates.templateType,
        name: companyTemplates.name,
      });
    if (!template) {
      return false;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: `company.${template.templateType}_template.deleted`,
      resourceType: "company_template",
      resourceId: template.id,
      metadata: { templateType: template.templateType, name: template.name },
    });
    return true;
  });
}
