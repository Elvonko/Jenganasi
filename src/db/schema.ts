import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { PricingPlanId } from "@/lib/pricing";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const rateLimits = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const companies = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    countryCode: text("country_code").notNull().default("KE"),
    currencyCode: text("currency_code").notNull().default("KES"),
    timezone: text("timezone").notNull().default("Africa/Nairobi"),
    planCode: text("plan_code").$type<PricingPlanId>().notNull().default("free"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("company_slug_unique").on(table.slug)],
);

export const memberships = pgTable(
  "company_membership",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("membership_company_user_unique").on(
      table.companyId,
      table.userId,
    ),
    index("membership_user_id_idx").on(table.userId),
  ],
);

export type ProjectTemplateData = {
  tasks: { title: string; description: string }[];
  milestones: { title: string }[];
};

export type EstimateTemplateData = {
  lineItems: {
    category: "materials" | "labour" | "equipment" | "subcontract" | "other";
    description: string;
    unit: string;
    quantity: number;
    unitRate: number;
  }[];
};

export type CompanyTemplateData = ProjectTemplateData | EstimateTemplateData;

export const companyTemplates = pgTable(
  "company_template",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    templateType: text("template_type").notNull(),
    name: text("name").notNull(),
    data: jsonb("data").$type<CompanyTemplateData>().notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("company_template_type_name_unique").on(
      table.companyId,
      table.templateType,
      table.name,
    ),
    index("company_template_company_type_idx").on(
      table.companyId,
      table.templateType,
    ),
  ],
);

export const customers = pgTable(
  "customer",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("customer_company_id_unique").on(table.companyId, table.id),
    index("customer_company_status_name_idx").on(
      table.companyId,
      table.status,
      table.name,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_event",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_company_occurred_idx").on(table.companyId, table.occurredAt),
    index("audit_resource_idx").on(
      table.companyId,
      table.resourceType,
      table.resourceId,
    ),
  ],
);

export const projects = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectCode: text("project_code").notNull(),
    name: text("name").notNull(),
    location: text("location").notNull().default(""),
    customerId: text("customer_id"),
    status: text("status").notNull().default("planned"),
    progressPercent: integer("progress_percent").notNull().default(0),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("project_company_id_unique").on(table.companyId, table.id),
    uniqueIndex("project_company_code_unique").on(
      table.companyId,
      table.projectCode,
    ),
    index("project_company_status_idx").on(table.companyId, table.status),
    index("project_company_created_at_idx").on(
      table.companyId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.companyId, table.customerId],
      foreignColumns: [customers.companyId, customers.id],
      name: "project_company_customer_fk",
    }),
  ],
);

export const projectPhases = pgTable(
  "project_phase",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("planned"),
    position: integer("position").notNull(),
    targetDate: date("target_date"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("project_phase_project_position_unique").on(
      table.projectId,
      table.position,
    ),
    index("project_phase_project_status_idx").on(
      table.projectId,
      table.status,
    ),
  ],
);

export const projectTasks = pgTable(
  "project_task",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    phaseId: text("phase_id").references(() => projectPhases.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("todo"),
    dueDate: date("due_date"),
    assignedTo: text("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("project_task_project_id_unique").on(
      table.projectId,
      table.id,
    ),
    index("project_task_project_status_idx").on(table.projectId, table.status),
    index("project_task_project_due_date_idx").on(table.projectId, table.dueDate),
    index("project_task_assigned_to_idx").on(table.assignedTo),
  ],
);

export const projectTaskDependencies = pgTable(
  "project_task_dependency",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    predecessorTaskId: text("predecessor_task_id").notNull(),
    successorTaskId: text("successor_task_id").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "project_task_dependency_not_self_check",
      sql`${table.predecessorTaskId} <> ${table.successorTaskId}`,
    ),
    foreignKey({
      columns: [table.projectId, table.predecessorTaskId],
      foreignColumns: [projectTasks.projectId, projectTasks.id],
      name: "project_task_dependency_predecessor_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.projectId, table.successorTaskId],
      foreignColumns: [projectTasks.projectId, projectTasks.id],
      name: "project_task_dependency_successor_fk",
    }).onDelete("cascade"),
    uniqueIndex("project_task_dependency_edge_unique").on(
      table.projectId,
      table.predecessorTaskId,
      table.successorTaskId,
    ),
    index("project_task_dependency_successor_idx").on(
      table.projectId,
      table.successorTaskId,
    ),
  ],
);

export const projectMilestones = pgTable(
  "project_milestone",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    targetDate: date("target_date"),
    status: text("status").notNull().default("planned"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("project_milestone_project_status_idx").on(
      table.projectId,
      table.status,
    ),
    index("project_milestone_project_target_date_idx").on(
      table.projectId,
      table.targetDate,
    ),
  ],
);

export const projectClientAccess = pgTable(
  "project_client_access",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    userId: text("user_id").notNull(),
    grantedBy: text("granted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("project_client_access_project_user_unique").on(
      table.projectId,
      table.userId,
    ),
    foreignKey({
      columns: [table.companyId, table.projectId],
      foreignColumns: [projects.companyId, projects.id],
      name: "project_client_access_company_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.companyId, table.userId],
      foreignColumns: [memberships.companyId, memberships.userId],
      name: "project_client_access_company_member_fk",
    }).onDelete("cascade"),
    index("project_client_access_user_idx").on(table.userId, table.projectId),
  ],
);

export const projectClientInvitations = pgTable(
  "project_client_invitation",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("project_client_invitation_token_hash_unique").on(
      table.tokenHash,
    ),
    foreignKey({
      columns: [table.companyId, table.projectId],
      foreignColumns: [projects.companyId, projects.id],
      name: "project_client_invitation_company_project_fk",
    }).onDelete("cascade"),
    index("project_client_invitation_project_idx").on(
      table.companyId,
      table.projectId,
    ),
  ],
);

const binaryData = customType<{
  data: Uint8Array;
  driverData: Uint8Array;
}>({
  dataType: () => "bytea",
});

export const projectMedia = pgTable(
  "project_media",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    category: text("category").$type<"image" | "video" | "file">().notNull(),
    fileSize: integer("file_size").notNull(),
    caption: text("caption").notNull().default(""),
    isShared: boolean("is_shared").notNull().default(false),
    data: binaryData("data").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.companyId, table.projectId],
      foreignColumns: [projects.companyId, projects.id],
      name: "project_media_company_project_fk",
    }).onDelete("cascade"),
    index("project_media_project_created_idx").on(
      table.companyId,
      table.projectId,
      table.createdAt,
    ),
  ],
);

export const estimates = pgTable(
  "estimate",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("draft"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("estimate_company_reference_unique").on(
      table.companyId,
      table.reference,
    ),
    index("estimate_company_created_at_idx").on(
      table.companyId,
      table.createdAt,
    ),
    index("estimate_project_idx").on(table.projectId),
  ],
);

export const estimateLineItems = pgTable(
  "estimate_line_item",
  {
    id: text("id").primaryKey(),
    estimateId: text("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    description: text("description").notNull(),
    unit: text("unit").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull(),
    unitRate: numeric("unit_rate", { precision: 14, scale: 2, mode: "number" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("estimate_line_item_estimate_idx").on(table.estimateId)],
);

export const suppliers = pgTable(
  "supplier",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    category: text("category").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("supplier_company_id_unique").on(table.companyId, table.id),
    index("supplier_company_status_name_idx").on(
      table.companyId,
      table.status,
      table.name,
    ),
  ],
);

export const purchaseOrders = pgTable(
  "purchase_order",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    supplierId: text("supplier_id").notNull(),
    projectId: text("project_id"),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    expectedDelivery: date("expected_delivery"),
    status: text("status").notNull().default("pending_approval"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("purchase_order_company_id_unique").on(
      table.companyId,
      table.id,
    ),
    uniqueIndex("purchase_order_company_reference_unique").on(
      table.companyId,
      table.reference,
    ),
    foreignKey({
      columns: [table.companyId, table.supplierId],
      foreignColumns: [suppliers.companyId, suppliers.id],
      name: "purchase_order_company_supplier_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.companyId, table.projectId],
      foreignColumns: [projects.companyId, projects.id],
      name: "purchase_order_company_project_fk",
    }).onDelete("restrict"),
    index("purchase_order_company_status_created_idx").on(
      table.companyId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const subscriptions = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    planCode: text("plan_code").$type<PricingPlanId>().notNull(),
    status: text("status")
      .$type<"pending" | "active" | "expired" | "cancelled">()
      .notNull()
      .default("pending"),
    msisdn: text("msisdn"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    autoRenew: boolean("auto_renew").notNull().default(false),
    autoRenewConsentAt: timestamp("auto_renew_consent_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("subscription_company_unique").on(table.companyId),
    index("subscription_renewal_idx").on(table.status, table.currentPeriodEnd),
  ],
);

export const mpesaPayments = pgTable(
  "mpesa_payment",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    initiatedBy: text("initiated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    planCode: text("plan_code").$type<PricingPlanId>().notNull(),
    amountKes: integer("amount_kes").notNull(),
    merchantRequestId: text("merchant_request_id"),
    checkoutRequestId: text("checkout_request_id"),
    status: text("status")
      .$type<"pending" | "success" | "failed" | "cancelled" | "reversed">()
      .notNull()
      .default("pending"),
    resultCode: text("result_code"),
    resultDesc: text("result_desc"),
    mpesaReceiptNumber: text("mpesa_receipt_number"),
    phoneNumber: text("phone_number"),
    initiatedAt: timestamp("initiated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
  },
  (table) => [
    uniqueIndex("mpesa_payment_checkout_unique").on(table.checkoutRequestId),
    index("mpesa_payment_company_initiated_idx").on(
      table.companyId,
      table.initiatedAt,
    ),
  ],
);

export type Company = typeof companies.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type CompanyTemplate = typeof companyTemplates.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectPhase = typeof projectPhases.$inferSelect;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type ProjectMedia = typeof projectMedia.$inferSelect;
export type Estimate = typeof estimates.$inferSelect;
export type EstimateLineItem = typeof estimateLineItems.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type MpesaPayment = typeof mpesaPayments.$inferSelect;
