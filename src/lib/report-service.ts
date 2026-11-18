import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import { db, ensureDatabase } from "@/db/client";
import {
  auditEvents,
  estimateLineItems,
  estimates,
  projectMilestones,
  projectTasks,
  projects,
  users,
} from "@/db/schema";
import { calculateEstimateTotal } from "@/lib/estimate-service";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { ProjectActor } from "@/lib/project-service";

export type CompanyReport = {
  projects: {
    id: string;
    projectCode: string;
    name: string;
    status: string;
    progressPercent: number;
    targetDate: string | null;
    taskCount: number;
    completedTaskCount: number;
    milestoneCount: number;
  }[];
  projectStatusCounts: Record<string, number>;
  averageProgress: number;
  taskCount: number;
  completedTaskCount: number;
  milestoneCount: number;
  completedMilestoneCount: number;
  estimateCount: number;
  estimatedTotal: number;
  estimateTotalsByStatus: Record<string, number>;
  recentActivity: {
    id: string;
    action: string;
    resourceType: string;
    resourceId: string;
    actorName: string;
    occurredAt: Date;
  }[];
};

function assertPermission(actor: ProjectActor, permission: Permission): void {
  if (!hasPermission(actor.role, permission)) {
    throw new Error(`Role "${actor.role}" cannot perform ${permission}.`);
  }
}

export async function getCompanyReport(
  actor: ProjectActor,
): Promise<CompanyReport> {
  assertPermission(actor, "reports:read");
  await ensureDatabase();

  const [projectRows, taskRows, milestoneRows, estimateRows, activityRows] =
    await Promise.all([
      db
        .select({
          id: projects.id,
          projectCode: projects.projectCode,
          name: projects.name,
          status: projects.status,
          progressPercent: projects.progressPercent,
          targetDate: projects.targetDate,
        })
        .from(projects)
        .where(
          and(
            eq(projects.companyId, actor.companyId),
            ne(projects.status, "archived"),
          ),
        )
        .orderBy(desc(projects.updatedAt)),
      db
        .select({
          projectId: projectTasks.projectId,
          status: projectTasks.status,
        })
        .from(projectTasks)
        .innerJoin(projects, eq(projectTasks.projectId, projects.id))
        .where(
          and(
            eq(projects.companyId, actor.companyId),
            ne(projects.status, "archived"),
          ),
        ),
      db
        .select({
          projectId: projectMilestones.projectId,
          status: projectMilestones.status,
        })
        .from(projectMilestones)
        .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
        .where(
          and(
            eq(projects.companyId, actor.companyId),
            ne(projects.status, "archived"),
          ),
        ),
      db
        .select({
          estimateId: estimates.id,
          status: estimates.status,
          quantity: estimateLineItems.quantity,
          unitRate: estimateLineItems.unitRate,
        })
        .from(estimates)
        .innerJoin(projects, eq(estimates.projectId, projects.id))
        .leftJoin(
          estimateLineItems,
          eq(estimateLineItems.estimateId, estimates.id),
        )
        .where(
          and(
            eq(estimates.companyId, actor.companyId),
            ne(projects.status, "archived"),
          ),
        ),
      db
        .select({
          id: auditEvents.id,
          action: auditEvents.action,
          resourceType: auditEvents.resourceType,
          resourceId: auditEvents.resourceId,
          actorName: users.name,
          occurredAt: auditEvents.occurredAt,
        })
        .from(auditEvents)
        .innerJoin(users, eq(auditEvents.actorUserId, users.id))
        .where(eq(auditEvents.companyId, actor.companyId))
        .orderBy(desc(auditEvents.occurredAt))
        .limit(12),
    ]);

  const tasksByProject = new Map<string, { total: number; completed: number }>();
  for (const task of taskRows) {
    const summary = tasksByProject.get(task.projectId) ?? {
      total: 0,
      completed: 0,
    };
    summary.total += 1;
    if (task.status === "completed") {
      summary.completed += 1;
    }
    tasksByProject.set(task.projectId, summary);
  }

  const milestonesByProject = new Map<string, { total: number; completed: number }>();
  for (const milestone of milestoneRows) {
    const summary = milestonesByProject.get(milestone.projectId) ?? {
      total: 0,
      completed: 0,
    };
    summary.total += 1;
    if (milestone.status === "completed") {
      summary.completed += 1;
    }
    milestonesByProject.set(milestone.projectId, summary);
  }

  const estimateItems = new Map<
    string,
    { status: string; items: { quantity: number; unitRate: number }[] }
  >();
  for (const estimate of estimateRows) {
    const summary = estimateItems.get(estimate.estimateId) ?? {
      status: estimate.status,
      items: [],
    };
    if (estimate.quantity !== null && estimate.unitRate !== null) {
      summary.items.push({
        quantity: estimate.quantity,
        unitRate: estimate.unitRate,
      });
    }
    estimateItems.set(estimate.estimateId, summary);
  }

  const estimateTotalsByStatus: Record<string, number> = {};
  const estimateTotalsByStatusCents: Record<string, number> = {};
  let estimatedTotalCents = 0;
  for (const estimate of estimateItems.values()) {
    const total = calculateEstimateTotal(estimate.items);
    const totalCents = Math.round(total * 100);
    estimatedTotalCents += totalCents;
    estimateTotalsByStatusCents[estimate.status] =
      (estimateTotalsByStatusCents[estimate.status] ?? 0) + totalCents;
  }
  for (const [status, cents] of Object.entries(estimateTotalsByStatusCents)) {
    estimateTotalsByStatus[status] = cents / 100;
  }

  const projectStatusCounts: Record<string, number> = {};
  for (const project of projectRows) {
    projectStatusCounts[project.status] =
      (projectStatusCounts[project.status] ?? 0) + 1;
  }

  return {
    projects: projectRows.map((project) => ({
      ...project,
      taskCount: tasksByProject.get(project.id)?.total ?? 0,
      completedTaskCount: tasksByProject.get(project.id)?.completed ?? 0,
      milestoneCount: milestonesByProject.get(project.id)?.total ?? 0,
    })),
    projectStatusCounts,
    averageProgress:
      projectRows.length === 0
        ? 0
        : Math.round(
            projectRows.reduce(
              (total, project) => total + project.progressPercent,
              0,
            ) / projectRows.length,
          ),
    taskCount: taskRows.length,
    completedTaskCount: taskRows.filter(
      (task) => task.status === "completed",
    ).length,
    milestoneCount: milestoneRows.length,
    completedMilestoneCount: milestoneRows.filter(
      (milestone) => milestone.status === "completed",
    ).length,
    estimateCount: estimateItems.size,
    estimatedTotal: estimatedTotalCents / 100,
    estimateTotalsByStatus,
    recentActivity: activityRows,
  };
}
