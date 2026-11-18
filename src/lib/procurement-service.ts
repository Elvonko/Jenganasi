import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, ensureDatabase } from "@/db/client";
import {
  auditEvents,
  projects,
  purchaseOrders,
  suppliers,
  type PurchaseOrder,
  type Supplier,
} from "@/db/schema";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { ProjectActor } from "@/lib/project-service";

const emailSchema = z
  .union([z.email("Enter a valid email address."), z.literal("")])
  .optional()
  .transform((email) => email?.trim().toLowerCase() || null);

export const supplierInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Supplier name must be at least 2 characters.")
    .max(120, "Supplier name must be no more than 120 characters."),
  email: emailSchema,
  phone: z.string().trim().max(32, "Phone number must be no more than 32 characters.").default(""),
  category: z.string().trim().max(80, "Category must be no more than 80 characters.").default(""),
});

const amountCentsSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter an amount with up to 2 decimal places.")
  .transform((amount) => Math.round(Number(amount) * 100))
  .refine(
    (amount) =>
      amount > 0 &&
      amount <= 2_147_483_647 &&
      Number.isSafeInteger(amount),
    {
      message: "Order value must be between 0.01 and 21,474,836.47.",
    },
  );

export const purchaseOrderInputSchema = z.object({
  supplierId: z.string().uuid("Choose a supplier."),
  projectId: z.union([z.string().uuid("Choose a valid project."), z.literal("")]).transform((value) => value || null),
  description: z
    .string()
    .trim()
    .min(3, "Describe what needs to be purchased.")
    .max(240, "Description must be no more than 240 characters."),
  amountCents: amountCentsSchema,
  expectedDelivery: z.union([z.string().date(), z.literal("")]).transform((value) => value || null),
});

export const purchaseOrderStatusSchema = z.enum([
  "approved",
  "ordered",
  "received",
  "cancelled",
]);

export type SupplierInput = z.infer<typeof supplierInputSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;
export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;
export type ProcurementActor = ProjectActor;
export type PurchaseOrderRecord = PurchaseOrder & {
  supplierName: string;
  projectName: string | null;
};

function assertPermission(
  actor: ProcurementActor,
  permission: Permission,
): void {
  if (!hasPermission(actor.role, permission)) {
    throw new Error(`Role "${actor.role}" cannot perform ${permission}.`);
  }
}

export async function listSuppliers(
  actor: ProcurementActor,
  includeInactive = false,
): Promise<Supplier[]> {
  assertPermission(actor, "procurement:read");
  await ensureDatabase();
  return db
    .select()
    .from(suppliers)
    .where(
      includeInactive
        ? eq(suppliers.companyId, actor.companyId)
        : and(
            eq(suppliers.companyId, actor.companyId),
            eq(suppliers.status, "active"),
          ),
    )
    .orderBy(suppliers.name);
}

export async function listPurchaseOrders(
  actor: ProcurementActor,
): Promise<PurchaseOrderRecord[]> {
  assertPermission(actor, "procurement:read");
  await ensureDatabase();
  return db
    .select({
      id: purchaseOrders.id,
      companyId: purchaseOrders.companyId,
      reference: purchaseOrders.reference,
      supplierId: purchaseOrders.supplierId,
      projectId: purchaseOrders.projectId,
      description: purchaseOrders.description,
      amountCents: purchaseOrders.amountCents,
      expectedDelivery: purchaseOrders.expectedDelivery,
      status: purchaseOrders.status,
      createdBy: purchaseOrders.createdBy,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      supplierName: suppliers.name,
      projectName: projects.name,
    })
    .from(purchaseOrders)
    .innerJoin(
      suppliers,
      and(
        eq(purchaseOrders.supplierId, suppliers.id),
        eq(purchaseOrders.companyId, suppliers.companyId),
      ),
    )
    .leftJoin(
      projects,
      and(
        eq(purchaseOrders.projectId, projects.id),
        eq(purchaseOrders.companyId, projects.companyId),
      ),
    )
    .where(eq(purchaseOrders.companyId, actor.companyId))
    .orderBy(desc(purchaseOrders.createdAt));
}

export async function createSupplier(
  actor: ProcurementActor,
  input: SupplierInput,
): Promise<Supplier> {
  assertPermission(actor, "procurement:create");
  await ensureDatabase();
  return db.transaction(async (transaction) => {
    const [supplier] = await transaction
      .insert(suppliers)
      .values({
        id: randomUUID(),
        companyId: actor.companyId,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        category: input.category,
        createdBy: actor.userId,
      })
      .returning();
    if (!supplier) {
      throw new Error("Supplier creation did not return a saved supplier.");
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "supplier.created",
      resourceType: "supplier",
      resourceId: supplier.id,
      metadata: { name: supplier.name },
    });
    return supplier;
  });
}

export async function createPurchaseOrder(
  actor: ProcurementActor,
  input: PurchaseOrderInput,
): Promise<PurchaseOrder | null> {
  assertPermission(actor, "procurement:create");
  await ensureDatabase();
  const [supplier] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(
      and(
        eq(suppliers.id, input.supplierId),
        eq(suppliers.companyId, actor.companyId),
        eq(suppliers.status, "active"),
      ),
    )
    .limit(1);
  if (!supplier) {
    return null;
  }

  if (input.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, input.projectId),
          eq(projects.companyId, actor.companyId),
        ),
      )
      .limit(1);
    if (!project) {
      return null;
    }
  }

  return db.transaction(async (transaction) => {
    const [purchaseOrder] = await transaction
      .insert(purchaseOrders)
      .values({
        id: randomUUID(),
        companyId: actor.companyId,
        reference: `PO-${new Date().getFullYear()}-${randomUUID()
          .slice(0, 8)
          .toUpperCase()}`,
        supplierId: supplier.id,
        projectId: input.projectId,
        description: input.description,
        amountCents: input.amountCents,
        expectedDelivery: input.expectedDelivery,
        createdBy: actor.userId,
      })
      .returning();
    if (!purchaseOrder) {
      throw new Error("Purchase order creation did not return a saved order.");
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "purchase_order.created",
      resourceType: "purchase_order",
      resourceId: purchaseOrder.id,
      metadata: {
        reference: purchaseOrder.reference,
        amountCents: purchaseOrder.amountCents,
      },
    });
    return purchaseOrder;
  });
}

export async function updatePurchaseOrderStatus(
  actor: ProcurementActor,
  purchaseOrderId: string,
  status: PurchaseOrderStatus,
): Promise<PurchaseOrder | null> {
  await ensureDatabase();
  const [current] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, purchaseOrderId),
        eq(purchaseOrders.companyId, actor.companyId),
      ),
    )
    .limit(1);
  if (!current) {
    return null;
  }

  const transitions: Record<string, { status: PurchaseOrderStatus; permission: Permission }[]> = {
    pending_approval: [
      { status: "approved", permission: "procurement:approve" },
      { status: "cancelled", permission: "procurement:update" },
    ],
    approved: [
      { status: "ordered", permission: "procurement:update" },
      { status: "cancelled", permission: "procurement:update" },
    ],
    ordered: [{ status: "received", permission: "procurement:receive" }],
    received: [],
    cancelled: [],
  };
  const transition = transitions[current.status]?.find(
    (candidate) => candidate.status === status,
  );
  if (!transition) {
    throw new Error(
      `Purchase order cannot move from "${current.status}" to "${status}".`,
    );
  }
  assertPermission(actor, transition.permission);

  return db.transaction(async (transaction) => {
    const [updated] = await transaction
      .update(purchaseOrders)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(purchaseOrders.id, purchaseOrderId),
          eq(purchaseOrders.companyId, actor.companyId),
          eq(purchaseOrders.status, current.status),
        ),
      )
      .returning();
    if (!updated) {
      return null;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: `purchase_order.${status}`,
      resourceType: "purchase_order",
      resourceId: updated.id,
      metadata: { reference: updated.reference, status },
    });
    return updated;
  });
}
