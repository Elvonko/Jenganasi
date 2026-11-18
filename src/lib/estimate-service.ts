import "server-only";

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, ensureDatabase } from "@/db/client";
import {
  auditEvents,
  companyTemplates,
  estimateLineItems,
  estimates,
  projects,
  type Estimate,
  type EstimateLineItem,
} from "@/db/schema";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { ProjectActor } from "@/lib/project-service";
import { estimateTemplateDataSchema } from "@/lib/company-template-service";

export const estimateStatusSchema = z.enum([
  "draft",
  "sent",
  "approved",
  "revision_requested",
]);

export const estimateInputSchema = z.object({
  projectId: z.string().uuid("Choose a project."),
  templateId: z.string().uuid("Choose a valid estimate template.").optional().or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(3, "Estimate name must be at least 3 characters.")
    .max(120),
});

export const estimateLineItemInputSchema = z.object({
  category: z.enum(["materials", "labour", "equipment", "subcontract", "other"]),
  description: z
    .string()
    .trim()
    .min(2, "Describe the work or material.")
    .max(180),
  unit: z.string().trim().min(1, "Enter a unit.").max(24),
  quantity: z.coerce
    .number()
    .finite()
    .positive("Quantity must be greater than zero.")
    .multipleOf(0.001, "Quantity supports up to 3 decimal places.")
    .max(999_999_999),
  unitRate: z.coerce
    .number()
    .finite()
    .nonnegative("Unit rate cannot be negative.")
    .multipleOf(0.01, "Unit rate supports up to 2 decimal places.")
    .max(999_999_999_999),
});

export type EstimateStatus = z.infer<typeof estimateStatusSchema>;
export type EstimateActor = ProjectActor;
export type EstimateRecord = Estimate & { projectName: string };
export type EstimateListRecord = EstimateRecord & {
  itemCount: number;
  total: number;
};

function assertPermission(
  actor: EstimateActor,
  permission: Permission,
): void {
  if (!hasPermission(actor.role, permission)) {
    throw new Error(`Role "${actor.role}" cannot perform ${permission}.`);
  }
}

function assertDraft(estimate: Estimate | undefined): asserts estimate is Estimate {
  if (!estimate) {
    throw new Error("Estimate not found.");
  }
  if (estimate.status !== "draft") {
    throw new Error("Only draft estimates can be edited.");
  }
}

export function calculateEstimateTotal(
  items: Pick<EstimateLineItem, "quantity" | "unitRate">[],
): number {
  const totalInCents = items.reduce(
    (total, item) => total + Math.round(item.quantity * item.unitRate * 100),
    0,
  );
  return totalInCents / 100;
}

export async function listEstimates(
  actor: EstimateActor,
): Promise<EstimateListRecord[]> {
  assertPermission(actor, "estimates:read");
  await ensureDatabase();

  const rows = await db
    .select({ estimate: estimates, projectName: projects.name })
    .from(estimates)
    .innerJoin(projects, eq(estimates.projectId, projects.id))
    .where(eq(estimates.companyId, actor.companyId))
    .orderBy(desc(estimates.updatedAt));

  if (rows.length === 0) {
    return [];
  }

  const lines = await db
    .select({
      estimateId: estimateLineItems.estimateId,
      quantity: estimateLineItems.quantity,
      unitRate: estimateLineItems.unitRate,
    })
    .from(estimateLineItems)
    .innerJoin(estimates, eq(estimateLineItems.estimateId, estimates.id))
    .where(eq(estimates.companyId, actor.companyId));
  const itemsByEstimate = new Map<string, { quantity: number; unitRate: number }[]>();

  for (const line of lines) {
    const items = itemsByEstimate.get(line.estimateId) ?? [];
    items.push({ quantity: line.quantity, unitRate: line.unitRate });
    itemsByEstimate.set(line.estimateId, items);
  }

  return rows.map(({ estimate, projectName }) => {
    const items = itemsByEstimate.get(estimate.id) ?? [];
    return {
      ...estimate,
      projectName,
      itemCount: items.length,
      total: calculateEstimateTotal(items),
    };
  });
}

export async function getEstimate(
  actor: EstimateActor,
  estimateId: string,
): Promise<(EstimateRecord & { items: EstimateLineItem[] }) | null> {
  assertPermission(actor, "estimates:read");
  await ensureDatabase();

  const [row] = await db
    .select({ estimate: estimates, projectName: projects.name })
    .from(estimates)
    .innerJoin(projects, eq(estimates.projectId, projects.id))
    .where(
      and(
        eq(estimates.id, estimateId),
        eq(estimates.companyId, actor.companyId),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const items = await db
    .select()
    .from(estimateLineItems)
    .where(eq(estimateLineItems.estimateId, row.estimate.id))
    .orderBy(estimateLineItems.createdAt);

  return { ...row.estimate, projectName: row.projectName, items };
}

export async function createEstimate(
  actor: EstimateActor,
  input: z.infer<typeof estimateInputSchema>,
): Promise<Estimate> {
  assertPermission(actor, "estimates:create");
  await ensureDatabase();

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, input.projectId),
        eq(projects.companyId, actor.companyId),
        ne(projects.status, "archived"),
      ),
    )
    .limit(1);

  if (!project) {
    throw new Error("Choose an active project in your company.");
  }

  return db.transaction(async (transaction) => {
    let templateData: z.infer<typeof estimateTemplateDataSchema> | undefined;
    if (input.templateId) {
      const [template] = await transaction
        .select()
        .from(companyTemplates)
        .where(
          and(
            eq(companyTemplates.id, input.templateId),
            eq(companyTemplates.companyId, actor.companyId),
            eq(companyTemplates.templateType, "estimate"),
          ),
        )
        .limit(1);
      if (!template) {
        throw new Error("Choose an estimate template from your company.");
      }
      const parsedTemplate = estimateTemplateDataSchema.safeParse(template.data);
      if (!parsedTemplate.success) {
        throw new Error("The selected estimate template contains invalid data.");
      }
      templateData = parsedTemplate.data;
    }

    const id = randomUUID();
    const reference = `EST-${new Date().getFullYear()}-${randomUUID()
      .slice(0, 6)
      .toUpperCase()}`;
    const [estimate] = await transaction
      .insert(estimates)
      .values({
        id,
        companyId: actor.companyId,
        projectId: project.id,
        reference,
        name: input.name,
        createdBy: actor.userId,
      })
      .returning();

    if (!estimate) {
      throw new Error("Estimate creation did not return a saved estimate.");
    }

    if (templateData) {
      await transaction.insert(estimateLineItems).values(
        templateData.lineItems.map((item) => ({
          id: randomUUID(),
          estimateId: estimate.id,
          ...item,
        })),
      );
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "estimate.created",
      resourceType: "estimate",
      resourceId: estimate.id,
      metadata: {
        reference: estimate.reference,
        projectId: project.id,
        ...(input.templateId ? { templateId: input.templateId } : {}),
      },
    });
    if (input.templateId && templateData) {
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        companyId: actor.companyId,
        actorUserId: actor.userId,
        action: "estimate.template_applied",
        resourceType: "estimate",
        resourceId: estimate.id,
        metadata: {
          templateId: input.templateId,
          lineItemCount: templateData.lineItems.length,
        },
      });
    }

    return estimate;
  });
}

export async function addEstimateLineItem(
  actor: EstimateActor,
  estimateId: string,
  input: z.infer<typeof estimateLineItemInputSchema>,
): Promise<EstimateLineItem> {
  assertPermission(actor, "estimates:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [estimate] = await transaction
      .select()
      .from(estimates)
      .where(
        and(
          eq(estimates.id, estimateId),
          eq(estimates.companyId, actor.companyId),
        ),
      )
      .limit(1);
    assertDraft(estimate);

    const [item] = await transaction
      .insert(estimateLineItems)
      .values({ id: randomUUID(), estimateId, ...input })
      .returning();

    if (!item) {
      throw new Error("Estimate item was not saved.");
    }

    await transaction
      .update(estimates)
      .set({ updatedAt: new Date() })
      .where(eq(estimates.id, estimateId));
    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "estimate.item_added",
      resourceType: "estimate",
      resourceId: estimateId,
      metadata: { category: item.category, description: item.description },
    });

    return item;
  });
}

export async function removeEstimateLineItem(
  actor: EstimateActor,
  estimateId: string,
  itemId: string,
): Promise<boolean> {
  assertPermission(actor, "estimates:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [estimate] = await transaction
      .select()
      .from(estimates)
      .where(
        and(
          eq(estimates.id, estimateId),
          eq(estimates.companyId, actor.companyId),
        ),
      )
      .limit(1);
    assertDraft(estimate);

    const [item] = await transaction
      .delete(estimateLineItems)
      .where(
        and(
          eq(estimateLineItems.id, itemId),
          eq(estimateLineItems.estimateId, estimateId),
        ),
      )
      .returning({ id: estimateLineItems.id });
    if (!item) {
      return false;
    }

    await transaction
      .update(estimates)
      .set({ updatedAt: new Date() })
      .where(eq(estimates.id, estimateId));
    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "estimate.item_removed",
      resourceType: "estimate",
      resourceId: estimateId,
      metadata: { itemId },
    });
    return true;
  });
}

export async function updateEstimateStatus(
  actor: EstimateActor,
  estimateId: string,
  nextStatus: EstimateStatus,
): Promise<Estimate | null> {
  assertPermission(actor, "estimates:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [estimate] = await transaction
      .select()
      .from(estimates)
      .where(
        and(
          eq(estimates.id, estimateId),
          eq(estimates.companyId, actor.companyId),
        ),
      )
      .limit(1);
    if (!estimate) {
      return null;
    }

    const allowedTransitions: Record<EstimateStatus, readonly EstimateStatus[]> = {
      draft: ["sent"],
      sent: ["approved", "revision_requested"],
      approved: [],
      revision_requested: ["draft"],
    };
    if (!allowedTransitions[estimate.status as EstimateStatus]?.includes(nextStatus)) {
      throw new Error("That estimate status change is not allowed.");
    }
    if (nextStatus === "sent") {
      const [lineSummary] = await transaction
        .select({ itemCount: count() })
        .from(estimateLineItems)
        .where(eq(estimateLineItems.estimateId, estimateId));
      if (!lineSummary || lineSummary.itemCount === 0) {
        throw new Error("Add at least one BOQ item before sending the estimate.");
      }
    }

    const [updated] = await transaction
      .update(estimates)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(estimates.id, estimateId))
      .returning();

    if (!updated) {
      throw new Error("Estimate status was not updated.");
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "estimate.status_changed",
      resourceType: "estimate",
      resourceId: estimate.id,
      metadata: { from: estimate.status, to: nextStatus },
    });
    return updated;
  });
}
