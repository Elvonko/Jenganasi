import "server-only";

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, ensureDatabase } from "@/db/client";
import {
  auditEvents,
  companyTemplates,
  companies,
  customers,
  projectMilestones,
  projectTasks,
  projects,
  type Project,
} from "@/db/schema";
import { hasPermission, type Permission } from "@/lib/permissions";
import { projectTemplateDataSchema } from "@/lib/company-template-service";
import { getPricingPlan } from "@/lib/pricing";

const projectStatusSchema = z.enum([
  "planned",
  "in_progress",
  "on_hold",
  "completed",
]);

export const projectInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters.")
      .max(120),
    location: z.string().trim().max(160).default(""),
    customerId: z.string().uuid("Choose a valid customer.").optional().or(z.literal("")),
    templateId: z.string().uuid("Choose a valid project template.").optional().or(z.literal("")),
    status: projectStatusSchema.default("planned"),
    progressPercent: z.coerce.number().int().min(0).max(100).default(0),
    startDate: z.string().date().optional().or(z.literal("")),
    targetDate: z.string().date().optional().or(z.literal("")),
  })
  .superRefine((project, context) => {
    if (
      project.startDate &&
      project.targetDate &&
      project.targetDate < project.startDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetDate"],
        message: "Target completion cannot be before the start date.",
      });
    }
  });

export type ProjectActor = {
  userId: string;
  companyId: string;
  role: Parameters<typeof hasPermission>[0];
};

export class ProjectLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectLimitError";
  }
}

function assertPermission(
  actor: ProjectActor,
  permission: Permission,
): void {
  if (!hasPermission(actor.role, permission)) {
    throw new Error(`Role "${actor.role}" cannot perform ${permission}.`);
  }
}

function toProjectValues(input: z.infer<typeof projectInputSchema>) {
  return {
    name: input.name,
    location: input.location,
    customerId:
      input.customerId === undefined ? undefined : input.customerId || null,
    status: input.status,
    progressPercent:
      input.status === "completed" ? 100 : input.progressPercent,
    startDate: input.startDate || null,
    targetDate: input.targetDate || null,
  };
}

export async function listProjects(actor: ProjectActor): Promise<Project[]> {
  assertPermission(actor, "projects:read");
  await ensureDatabase();
  return db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.companyId, actor.companyId),
        ne(projects.status, "archived"),
      ),
    )
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectUsage(actor: ProjectActor): Promise<number> {
  assertPermission(actor, "projects:read");
  await ensureDatabase();
  const [usage] = await db
    .select({ total: count() })
    .from(projects)
    .where(eq(projects.companyId, actor.companyId));
  return usage?.total ?? 0;
}

export async function getProject(
  actor: ProjectActor,
  projectId: string,
): Promise<Project | null> {
  assertPermission(actor, "projects:read");
  await ensureDatabase();
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.companyId, actor.companyId),
        ne(projects.status, "archived"),
      ),
    )
    .limit(1);
  return project ?? null;
}

export async function createProject(
  actor: ProjectActor,
  input: z.infer<typeof projectInputSchema>,
): Promise<Project> {
  assertPermission(actor, "projects:create");
  await ensureDatabase();
  const project = await db.transaction(async (transaction) => {
    const [company] = await transaction
      .select({ planCode: companies.planCode })
      .from(companies)
      .where(eq(companies.id, actor.companyId))
      .for("update")
      .limit(1);
    if (!company) {
      throw new Error("Company workspace not found.");
    }

    let templateData: z.infer<typeof projectTemplateDataSchema> | undefined;
    if (input.templateId) {
      const [template] = await transaction
        .select()
        .from(companyTemplates)
        .where(
          and(
            eq(companyTemplates.id, input.templateId),
            eq(companyTemplates.companyId, actor.companyId),
            eq(companyTemplates.templateType, "project"),
          ),
        )
        .limit(1);
      if (!template) {
        throw new Error("Choose a project template from your company.");
      }
      const parsedTemplate = projectTemplateDataSchema.safeParse(template.data);
      if (!parsedTemplate.success) {
        throw new Error("The selected project template contains invalid data.");
      }
      templateData = parsedTemplate.data;
    }

    if (input.customerId) {
      const [customer] = await transaction
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.companyId, actor.companyId),
            eq(customers.status, "active"),
          ),
        )
        .limit(1);
      if (!customer) {
        throw new Error("Choose an active customer from this company.");
      }
    }

    const projectLimit = getPricingPlan(company.planCode).projectLimit;
    if (projectLimit !== null) {
      const [usage] = await transaction
        .select({ total: count() })
        .from(projects)
        .where(
          and(
            eq(projects.companyId, actor.companyId),
            ne(projects.status, "archived"),
          ),
        );
      if ((usage?.total ?? 0) >= projectLimit) {
        throw new ProjectLimitError(
          `Your ${getPricingPlan(company.planCode).name} plan allows ${projectLimit} project${projectLimit === 1 ? "" : "s"}. Visit /pricing to review plans.`,
        );
      }
    }

    const [createdProject] = await transaction
      .insert(projects)
      .values({
        id: randomUUID(),
        companyId: actor.companyId,
        projectCode: `JGN-${new Date().getFullYear()}-${randomUUID()
          .slice(0, 6)
          .toUpperCase()}`,
        ...toProjectValues(input),
        createdBy: actor.userId,
      })
      .returning();

    if (!createdProject) {
      throw new Error("Project creation did not return a saved project.");
    }

    if (templateData?.tasks.length) {
      await transaction.insert(projectTasks).values(
        templateData.tasks.map((task) => ({
          id: randomUUID(),
          projectId: createdProject.id,
          title: task.title,
          description: task.description,
          createdBy: actor.userId,
        })),
      );
    }
    if (templateData?.milestones.length) {
      await transaction.insert(projectMilestones).values(
        templateData.milestones.map((milestone) => ({
          id: randomUUID(),
          projectId: createdProject.id,
          title: milestone.title,
          createdBy: actor.userId,
        })),
      );
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.created",
      resourceType: "project",
      resourceId: createdProject.id,
      metadata: {
        projectCode: createdProject.projectCode,
        ...(input.templateId ? { templateId: input.templateId } : {}),
      },
    });
    if (input.templateId && templateData) {
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        companyId: actor.companyId,
        actorUserId: actor.userId,
        action: "project.template_applied",
        resourceType: "project",
        resourceId: createdProject.id,
        metadata: {
          templateId: input.templateId,
          taskCount: templateData.tasks.length,
          milestoneCount: templateData.milestones.length,
        },
      });
    }
    return createdProject;
  });

  return project;
}

export async function updateProject(
  actor: ProjectActor,
  projectId: string,
  input: z.infer<typeof projectInputSchema>,
): Promise<Project | null> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();
  return db.transaction(async (transaction) => {
    const [existingProject] = await transaction
      .select({
        id: projects.id,
        customerId: projects.customerId,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, actor.companyId),
          ne(projects.status, "archived"),
        ),
      )
      .limit(1);
    if (!existingProject) {
      return null;
    }

    if (input.customerId && input.customerId !== existingProject.customerId) {
      const [customer] = await transaction
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.companyId, actor.companyId),
            eq(customers.status, "active"),
          ),
        )
        .limit(1);
      if (!customer) {
        throw new Error("Choose an active customer from this company.");
      }
    }

    const [project] = await transaction
      .update(projects)
      .set({ ...toProjectValues(input), updatedAt: new Date() })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, actor.companyId),
          ne(projects.status, "archived"),
        ),
      )
      .returning();

    if (!project) {
      return null;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.updated",
      resourceType: "project",
      resourceId: project.id,
      metadata: { status: project.status },
    });
    return project;
  });
}

export async function archiveProject(
  actor: ProjectActor,
  projectId: string,
): Promise<boolean> {
  assertPermission(actor, "projects:archive");
  await ensureDatabase();
  return db.transaction(async (transaction) => {
    const archived = await transaction
      .update(projects)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, actor.companyId),
          ne(projects.status, "archived"),
        ),
      )
      .returning({ id: projects.id });

    if (archived.length === 0) {
      return false;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.archived",
      resourceType: "project",
      resourceId: projectId,
      metadata: {},
    });
    return true;
  });
}
