import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, ensureDatabase } from "@/db/client";
import { auditEvents, customers, projects, type Customer } from "@/db/schema";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { ProjectActor } from "@/lib/project-service";

export const customerStatusSchema = z.enum(["active", "inactive"]);

export const customerInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters.")
    .max(120, "Customer name must be no more than 120 characters."),
  email: z
    .union([z.email("Enter a valid email address."), z.literal("")])
    .optional()
    .transform((email) => email?.trim().toLowerCase() || null),
  phone: z
    .string()
    .trim()
    .max(32, "Phone number must be no more than 32 characters.")
    .default(""),
  address: z
    .string()
    .trim()
    .max(240, "Address must be no more than 240 characters.")
    .default(""),
});

export type CustomerActor = ProjectActor;
export type CustomerInput = z.infer<typeof customerInputSchema>;
export type CustomerStatus = z.infer<typeof customerStatusSchema>;
export type CustomerProjectRecord = Customer & { projectCount: number };

function assertPermission(
  actor: CustomerActor,
  permission: Permission,
): void {
  if (!hasPermission(actor.role, permission)) {
    throw new Error(`Role "${actor.role}" cannot perform ${permission}.`);
  }
}

export async function listCustomers(
  actor: CustomerActor,
  includeInactive = false,
): Promise<CustomerProjectRecord[]> {
  assertPermission(actor, "customers:read");
  await ensureDatabase();
  const rows = await db
    .select({
      customer: customers,
      projectId: projects.id,
    })
    .from(customers)
    .leftJoin(
      projects,
      and(eq(projects.customerId, customers.id), eq(projects.companyId, actor.companyId)),
    )
    .where(
      includeInactive
        ? eq(customers.companyId, actor.companyId)
        : and(
            eq(customers.companyId, actor.companyId),
            eq(customers.status, "active"),
          ),
    )
    .orderBy(asc(customers.name));

  const projectsByCustomer = new Map<string, Set<string>>();
  for (const row of rows) {
    const projectIds = projectsByCustomer.get(row.customer.id) ?? new Set();
    if (row.projectId) {
      projectIds.add(row.projectId);
    }
    projectsByCustomer.set(row.customer.id, projectIds);
  }

  const customersById = new Map<string, Customer>();
  for (const row of rows) {
    customersById.set(row.customer.id, row.customer);
  }

  return [...customersById.values()].map((customer) => ({
    ...customer,
    projectCount: projectsByCustomer.get(customer.id)?.size ?? 0,
  }));
}

export async function getCustomer(
  actor: CustomerActor,
  customerId: string,
): Promise<Customer | null> {
  assertPermission(actor, "customers:read");
  await ensureDatabase();
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.companyId, actor.companyId),
      ),
    )
    .limit(1);
  return customer ?? null;
}

export async function createCustomer(
  actor: CustomerActor,
  input: CustomerInput,
): Promise<Customer> {
  assertPermission(actor, "customers:create");
  await ensureDatabase();
  return db.transaction(async (transaction) => {
    const [customer] = await transaction
      .insert(customers)
      .values({
        id: randomUUID(),
        companyId: actor.companyId,
        ...input,
        phone: input.phone || null,
        address: input.address || null,
        createdBy: actor.userId,
      })
      .returning();
    if (!customer) {
      throw new Error("Customer creation did not return a saved customer.");
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "customer.created",
      resourceType: "customer",
      resourceId: customer.id,
      metadata: { name: customer.name },
    });
    return customer;
  });
}

export async function updateCustomer(
  actor: CustomerActor,
  customerId: string,
  input: CustomerInput,
): Promise<Customer | null> {
  assertPermission(actor, "customers:update");
  await ensureDatabase();
  return db.transaction(async (transaction) => {
    const [customer] = await transaction
      .update(customers)
      .set({
        ...input,
        phone: input.phone || null,
        address: input.address || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.companyId, actor.companyId),
        ),
      )
      .returning();
    if (!customer) {
      return null;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "customer.updated",
      resourceType: "customer",
      resourceId: customer.id,
      metadata: { name: customer.name },
    });
    return customer;
  });
}

export async function setCustomerStatus(
  actor: CustomerActor,
  customerId: string,
  status: CustomerStatus,
): Promise<Customer | null> {
  assertPermission(actor, "customers:archive");
  await ensureDatabase();
  return db.transaction(async (transaction) => {
    const [customer] = await transaction
      .update(customers)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.companyId, actor.companyId),
        ),
      )
      .returning();
    if (!customer) {
      return null;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: status === "inactive" ? "customer.archived" : "customer.restored",
      resourceType: "customer",
      resourceId: customer.id,
      metadata: { status },
    });
    return customer;
  });
}
