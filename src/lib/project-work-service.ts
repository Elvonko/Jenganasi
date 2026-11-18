import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db, ensureDatabase } from "@/db/client";
import {
  auditEvents,
  memberships,
  projectMilestones,
  projectPhases,
  projectTaskDependencies,
  projectTasks,
  projects,
  users,
  type ProjectMilestone,
  type ProjectPhase,
  type ProjectTask,
} from "@/db/schema";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { ProjectActor } from "@/lib/project-service";

export const projectTaskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "completed",
]);
export const projectMilestoneStatusSchema = z.enum(["planned", "completed"]);
export const projectPhaseStatusSchema = z.enum([
  "planned",
  "in_progress",
  "completed",
]);

const optionalDate = z.string().date().optional().or(z.literal(""));

export const projectTaskInputSchema = z.object({
  projectId: z.string().uuid("Project not found."),
  phaseId: z.string().uuid("Choose a valid project phase.").optional().or(z.literal("")),
  title: z
    .string()
    .trim()
    .min(3, "Task title must be at least 3 characters.")
    .max(120, "Task title must be no more than 120 characters."),
  description: z
    .string()
    .trim()
    .max(500, "Task details must be no more than 500 characters.")
    .default(""),
  dueDate: optionalDate,
  assigneeId: z
    .string()
    .uuid("Choose a valid team member.")
    .optional()
    .or(z.literal("")),
});

export const projectPhaseInputSchema = z.object({
  projectId: z.string().uuid("Project not found."),
  name: z
    .string()
    .trim()
    .min(3, "Phase name must be at least 3 characters.")
    .max(120, "Phase name must be no more than 120 characters."),
  description: z.string().trim().max(500).default(""),
  targetDate: optionalDate,
});

export const projectTaskPhaseInputSchema = z.object({
  projectId: z.string().uuid("Project not found."),
  taskId: z.string().uuid("Task not found."),
  phaseId: z.string().uuid("Choose a valid project phase.").optional().or(z.literal("")),
});

export const projectTaskDependencyInputSchema = z.object({
  projectId: z.string().uuid("Project not found."),
  predecessorTaskId: z.string().uuid("Choose a prerequisite task."),
  successorTaskId: z.string().uuid("Choose a task that depends on it."),
});

export const projectTaskDependencyRemovalInputSchema = z.object({
  projectId: z.string().uuid("Project not found."),
  dependencyId: z.string().uuid("Dependency not found."),
});

export const projectTaskAssignmentInputSchema = z.object({
  projectId: z.string().uuid("Project not found."),
  taskId: z.string().uuid("Task not found."),
  assigneeId: z
    .string()
    .uuid("Choose a valid team member.")
    .optional()
    .or(z.literal(""))
    .default(""),
});

export const projectMilestoneInputSchema = z.object({
  projectId: z.string().uuid("Project not found."),
  title: z
    .string()
    .trim()
    .min(3, "Milestone name must be at least 3 characters.")
    .max(120, "Milestone name must be no more than 120 characters."),
  targetDate: optionalDate,
});

export type ProjectWorkActor = ProjectActor;
export type ProjectTaskStatus = z.infer<typeof projectTaskStatusSchema>;
export type ProjectMilestoneStatus = z.infer<
  typeof projectMilestoneStatusSchema
>;
export type ProjectTaskListItem = ProjectTask & {
  assigneeName: string | null;
  phaseName: string | null;
  predecessors: ProjectTaskRelation[];
  successors: ProjectTaskRelation[];
};
export type ProjectTaskRelation = {
  dependencyId: string;
  taskId: string;
  title: string;
  status: ProjectTask["status"];
};
export type ProjectPhaseListItem = ProjectPhase & {
  taskCount: number;
  completedTaskCount: number;
};

const assignableMemberRoles = [
  "owner",
  "admin",
  "project_manager",
  "site_supervisor",
  "accountant",
  "procurement_officer",
  "storekeeper",
  "sales_representative",
] as const;

function assertPermission(
  actor: ProjectWorkActor,
  permission: Permission,
): void {
  if (!hasPermission(actor.role, permission)) {
    throw new Error(`Role "${actor.role}" cannot perform ${permission}.`);
  }
}

export async function listProjectTasks(
  actor: ProjectWorkActor,
  projectId: string,
): Promise<ProjectTaskListItem[]> {
  assertPermission(actor, "projects:read");
  await ensureDatabase();
  const rows = await db
    .select({
      task: projectTasks,
      assigneeName: users.name,
      phaseName: projectPhases.name,
    })
    .from(projectTasks)
    .innerJoin(projects, eq(projectTasks.projectId, projects.id))
    .leftJoin(projectPhases, eq(projectTasks.phaseId, projectPhases.id))
    .leftJoin(
      memberships,
      and(
        eq(memberships.userId, projectTasks.assignedTo),
        eq(memberships.companyId, projects.companyId),
        inArray(memberships.role, [...assignableMemberRoles]),
      ),
    )
    .leftJoin(users, eq(memberships.userId, users.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.companyId, actor.companyId),
        ne(projects.status, "archived"),
      ),
    )
    .orderBy(asc(projectTasks.dueDate), asc(projectTasks.createdAt));
  const tasks = rows.map(({ task, assigneeName, phaseName }) => ({
    ...task,
    assigneeName,
    phaseName,
  }));
  const dependencies = await db
    .select({
      id: projectTaskDependencies.id,
      predecessorTaskId: projectTaskDependencies.predecessorTaskId,
      successorTaskId: projectTaskDependencies.successorTaskId,
    })
    .from(projectTaskDependencies)
    .innerJoin(projects, eq(projectTaskDependencies.projectId, projects.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.companyId, actor.companyId),
        ne(projects.status, "archived"),
      ),
    );
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const predecessorsByTask = new Map<string, ProjectTaskRelation[]>();
  const successorsByTask = new Map<string, ProjectTaskRelation[]>();
  for (const dependency of dependencies) {
    const predecessor = tasksById.get(dependency.predecessorTaskId);
    const successor = tasksById.get(dependency.successorTaskId);
    if (!predecessor || !successor) continue;

    const predecessorRelation = {
      dependencyId: dependency.id,
      taskId: predecessor.id,
      title: predecessor.title,
      status: predecessor.status,
    };
    const successorRelation = {
      dependencyId: dependency.id,
      taskId: successor.id,
      title: successor.title,
      status: successor.status,
    };
    predecessorsByTask.set(successor.id, [
      ...(predecessorsByTask.get(successor.id) ?? []),
      predecessorRelation,
    ]);
    successorsByTask.set(predecessor.id, [
      ...(successorsByTask.get(predecessor.id) ?? []),
      successorRelation,
    ]);
  }
  return tasks.map((task) => ({
    ...task,
    predecessors: predecessorsByTask.get(task.id) ?? [],
    successors: successorsByTask.get(task.id) ?? [],
  }));
}

export async function createProjectTaskDependency(
  actor: ProjectWorkActor,
  input: z.infer<typeof projectTaskDependencyInputSchema>,
): Promise<typeof projectTaskDependencies.$inferSelect> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [project] = await transaction
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
      throw new Error("Project not found or no longer available.");
    }

    if (input.predecessorTaskId === input.successorTaskId) {
      throw new Error("A task cannot depend on itself.");
    }

    const projectTasksForDependency = await transaction
      .select({ id: projectTasks.id })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.projectId, project.id),
          inArray(projectTasks.id, [
            input.predecessorTaskId,
            input.successorTaskId,
          ]),
        ),
      );
    if (projectTasksForDependency.length !== 2) {
      throw new Error("Choose both tasks from this project.");
    }

    const existingDependencies = await transaction
      .select({
        id: projectTaskDependencies.id,
        predecessorTaskId: projectTaskDependencies.predecessorTaskId,
        successorTaskId: projectTaskDependencies.successorTaskId,
      })
      .from(projectTaskDependencies)
      .where(eq(projectTaskDependencies.projectId, project.id));
    if (
      existingDependencies.some(
        (dependency) =>
          dependency.predecessorTaskId === input.predecessorTaskId &&
          dependency.successorTaskId === input.successorTaskId,
      )
    ) {
      throw new Error("That task dependency already exists.");
    }

    const successorsByTask = new Map<string, string[]>();
    for (const dependency of existingDependencies) {
      successorsByTask.set(dependency.predecessorTaskId, [
        ...(successorsByTask.get(dependency.predecessorTaskId) ?? []),
        dependency.successorTaskId,
      ]);
    }
    const pendingTasks = [input.successorTaskId];
    const visited = new Set<string>();
    while (pendingTasks.length > 0) {
      const currentTaskId = pendingTasks.pop();
      if (!currentTaskId || visited.has(currentTaskId)) continue;
      if (currentTaskId === input.predecessorTaskId) {
        throw new Error("That dependency would create a schedule cycle.");
      }
      visited.add(currentTaskId);
      pendingTasks.push(...(successorsByTask.get(currentTaskId) ?? []));
    }

    const [dependency] = await transaction
      .insert(projectTaskDependencies)
      .values({
        id: randomUUID(),
        projectId: project.id,
        predecessorTaskId: input.predecessorTaskId,
        successorTaskId: input.successorTaskId,
        createdBy: actor.userId,
      })
      .returning();
    if (!dependency) {
      throw new Error("Task dependency creation did not return a saved record.");
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.task.dependency_created",
      resourceType: "project_task_dependency",
      resourceId: dependency.id,
      metadata: {
        projectId: project.id,
        predecessorTaskId: dependency.predecessorTaskId,
        successorTaskId: dependency.successorTaskId,
      },
    });
    return dependency;
  });
}

export async function removeProjectTaskDependency(
  actor: ProjectWorkActor,
  projectId: string,
  dependencyId: string,
): Promise<boolean> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [project] = await transaction
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, actor.companyId),
          ne(projects.status, "archived"),
        ),
      )
      .limit(1);
    if (!project) return false;

    const [dependency] = await transaction
      .delete(projectTaskDependencies)
      .where(
        and(
          eq(projectTaskDependencies.id, dependencyId),
          eq(projectTaskDependencies.projectId, project.id),
        ),
      )
      .returning();
    if (!dependency) return false;

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.task.dependency_removed",
      resourceType: "project_task_dependency",
      resourceId: dependency.id,
      metadata: {
        projectId: project.id,
        predecessorTaskId: dependency.predecessorTaskId,
        successorTaskId: dependency.successorTaskId,
      },
    });
    return true;
  });
}

export async function listProjectPhases(
  actor: ProjectWorkActor,
  projectId: string,
): Promise<ProjectPhaseListItem[]> {
  assertPermission(actor, "projects:read");
  await ensureDatabase();
  const phases = await db
    .select({ phase: projectPhases })
    .from(projectPhases)
    .innerJoin(projects, eq(projectPhases.projectId, projects.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.companyId, actor.companyId),
        ne(projects.status, "archived"),
      ),
    )
    .orderBy(asc(projectPhases.position));
  if (phases.length === 0) return [];

  const tasks = await db
    .select({
      id: projectTasks.id,
      phaseId: projectTasks.phaseId,
      status: projectTasks.status,
    })
    .from(projectTasks)
    .where(eq(projectTasks.projectId, projectId));
  const taskCounts = new Map<string, { total: number; completed: number }>();
  for (const task of tasks) {
    if (!task.phaseId) continue;
    const counts = taskCounts.get(task.phaseId) ?? { total: 0, completed: 0 };
    counts.total += 1;
    if (task.status === "completed") counts.completed += 1;
    taskCounts.set(task.phaseId, counts);
  }

  return phases.map(({ phase }) => {
    const counts = taskCounts.get(phase.id) ?? { total: 0, completed: 0 };
    return {
      ...phase,
      taskCount: counts.total,
      completedTaskCount: counts.completed,
    };
  });
}

export async function listProjectAssignees(
  actor: ProjectWorkActor,
): Promise<{ id: string; name: string; role: string }[]> {
  assertPermission(actor, "projects:read");
  await ensureDatabase();
  return db
    .select({
      id: memberships.userId,
      name: users.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(
      and(
        eq(memberships.companyId, actor.companyId),
        inArray(memberships.role, [...assignableMemberRoles]),
      ),
    )
    .orderBy(asc(users.name));
}

export async function createProjectTask(
  actor: ProjectWorkActor,
  input: z.infer<typeof projectTaskInputSchema>,
): Promise<ProjectTask> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [project] = await transaction
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
      throw new Error("Project not found or no longer available.");
    }

    if (input.assigneeId) {
      const [assignee] = await transaction
        .select({ userId: memberships.userId })
        .from(memberships)
        .where(
          and(
            eq(memberships.companyId, actor.companyId),
            eq(memberships.userId, input.assigneeId),
            inArray(memberships.role, [...assignableMemberRoles]),
          ),
        )
        .limit(1);
      if (!assignee) {
        throw new Error("Choose an internal team member from this company.");
      }
    }

    if (input.phaseId) {
      const [phase] = await transaction
        .select({
          id: projectPhases.id,
          projectId: projectPhases.projectId,
        })
        .from(projectPhases)
        .where(eq(projectPhases.id, input.phaseId))
        .limit(1);
      if (!phase || phase.projectId !== project.id) {
        throw new Error("Choose a phase from this project.");
      }
    }

    const [task] = await transaction
      .insert(projectTasks)
      .values({
        id: randomUUID(),
        projectId: project.id,
        phaseId: input.phaseId || null,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate || null,
        assignedTo: input.assigneeId || null,
        createdBy: actor.userId,
      })
      .returning();
    if (!task) {
      throw new Error("Task creation did not return a saved task.");
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.task.created",
      resourceType: "project_task",
      resourceId: task.id,
      metadata: {
        projectId: project.id,
        title: task.title,
        assigneeId: task.assignedTo,
        phaseId: task.phaseId,
      },
    });
    return task;
  });
}

export async function createProjectPhase(
  actor: ProjectWorkActor,
  input: z.infer<typeof projectPhaseInputSchema>,
): Promise<ProjectPhase> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [project] = await transaction
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
      throw new Error("Project not found or no longer available.");
    }

    const previousPhases = await transaction
      .select({ position: projectPhases.position })
      .from(projectPhases)
      .where(eq(projectPhases.projectId, project.id))
      .orderBy(asc(projectPhases.position));
    const position = (previousPhases.at(-1)?.position ?? 0) + 1;
    const [phase] = await transaction
      .insert(projectPhases)
      .values({
        id: randomUUID(),
        projectId: project.id,
        name: input.name,
        description: input.description,
        targetDate: input.targetDate || null,
        position,
        createdBy: actor.userId,
      })
      .returning();
    if (!phase) {
      throw new Error("Phase creation did not return a saved phase.");
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.phase.created",
      resourceType: "project_phase",
      resourceId: phase.id,
      metadata: { projectId: project.id, name: phase.name, position },
    });
    return phase;
  });
}

export async function updateProjectPhaseStatus(
  actor: ProjectWorkActor,
  projectId: string,
  phaseId: string,
  status: z.infer<typeof projectPhaseStatusSchema>,
): Promise<ProjectPhase | null> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();
  return db.transaction(async (transaction) => {
    const [project] = await transaction
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, actor.companyId),
          ne(projects.status, "archived"),
        ),
      )
      .limit(1);
    if (!project) return null;

    const [phase] = await transaction
      .update(projectPhases)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(projectPhases.id, phaseId),
          eq(projectPhases.projectId, project.id),
        ),
      )
      .returning();
    if (!phase) return null;

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.phase.status_updated",
      resourceType: "project_phase",
      resourceId: phase.id,
      metadata: { projectId, status: phase.status },
    });
    return phase;
  });
}

export async function updateProjectTaskPhase(
  actor: ProjectWorkActor,
  projectId: string,
  taskId: string,
  phaseId: string | null,
): Promise<ProjectTask | null> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();
  return db.transaction(async (transaction) => {
    const [project] = await transaction
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, actor.companyId),
          ne(projects.status, "archived"),
        ),
      )
      .limit(1);
    if (!project) return null;

    if (phaseId) {
      const [phase] = await transaction
        .select({
          id: projectPhases.id,
          projectId: projectPhases.projectId,
        })
        .from(projectPhases)
        .where(eq(projectPhases.id, phaseId))
        .limit(1);
      if (!phase || phase.projectId !== project.id) {
        throw new Error("Choose a phase from this project.");
      }
    }

    const [task] = await transaction
      .update(projectTasks)
      .set({ phaseId, updatedAt: new Date() })
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, projectId),
        ),
      )
      .returning();
    if (!task) return null;

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.task.phase_updated",
      resourceType: "project_task",
      resourceId: task.id,
      metadata: { projectId, phaseId },
    });
    return task;
  });
}

export async function assignProjectTask(
  actor: ProjectWorkActor,
  projectId: string,
  taskId: string,
  assigneeId: string | null,
): Promise<ProjectTask | null> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [project] = await transaction
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, actor.companyId),
          ne(projects.status, "archived"),
        ),
      )
      .limit(1);
    if (!project) {
      return null;
    }

    if (assigneeId) {
      const [assignee] = await transaction
        .select({ userId: memberships.userId })
        .from(memberships)
        .where(
          and(
            eq(memberships.companyId, actor.companyId),
            eq(memberships.userId, assigneeId),
            inArray(memberships.role, [...assignableMemberRoles]),
          ),
        )
        .limit(1);
      if (!assignee) {
        throw new Error("Choose an internal team member from this company.");
      }
    }

    const [task] = await transaction
      .update(projectTasks)
      .set({ assignedTo: assigneeId, updatedAt: new Date() })
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, project.id),
        ),
      )
      .returning();
    if (!task) {
      return null;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: assigneeId ? "project.task.assigned" : "project.task.unassigned",
      resourceType: "project_task",
      resourceId: task.id,
      metadata: { projectId: project.id, assigneeId },
    });
    return task;
  });
}

export async function updateProjectTaskStatus(
  actor: ProjectWorkActor,
  projectId: string,
  taskId: string,
  status: ProjectTaskStatus,
): Promise<ProjectTask | null> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [project] = await transaction
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, actor.companyId),
          ne(projects.status, "archived"),
        ),
      )
      .limit(1);
    if (!project) {
      return null;
    }

    const [task] = await transaction
      .update(projectTasks)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, project.id),
        ),
      )
      .returning();
    if (!task) {
      return null;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.task.status_updated",
      resourceType: "project_task",
      resourceId: task.id,
      metadata: { projectId: project.id, status: task.status },
    });
    return task;
  });
}

export async function listProjectMilestones(
  actor: ProjectWorkActor,
  projectId: string,
): Promise<ProjectMilestone[]> {
  assertPermission(actor, "projects:read");
  await ensureDatabase();
  const rows = await db
    .select({ milestone: projectMilestones })
    .from(projectMilestones)
    .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.companyId, actor.companyId),
        ne(projects.status, "archived"),
      ),
    )
    .orderBy(asc(projectMilestones.targetDate), asc(projectMilestones.createdAt));
  return rows.map(({ milestone }) => milestone);
}

export async function createProjectMilestone(
  actor: ProjectWorkActor,
  input: z.infer<typeof projectMilestoneInputSchema>,
): Promise<ProjectMilestone> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [project] = await transaction
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
      throw new Error("Project not found or no longer available.");
    }

    const [milestone] = await transaction
      .insert(projectMilestones)
      .values({
        id: randomUUID(),
        projectId: project.id,
        title: input.title,
        targetDate: input.targetDate || null,
        createdBy: actor.userId,
      })
      .returning();
    if (!milestone) {
      throw new Error("Milestone creation did not return a saved milestone.");
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.milestone.created",
      resourceType: "project_milestone",
      resourceId: milestone.id,
      metadata: { projectId: project.id, title: milestone.title },
    });
    return milestone;
  });
}

export async function updateProjectMilestoneStatus(
  actor: ProjectWorkActor,
  projectId: string,
  milestoneId: string,
  status: ProjectMilestoneStatus,
): Promise<ProjectMilestone | null> {
  assertPermission(actor, "projects:update");
  await ensureDatabase();

  return db.transaction(async (transaction) => {
    const [project] = await transaction
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, actor.companyId),
          ne(projects.status, "archived"),
        ),
      )
      .limit(1);
    if (!project) {
      return null;
    }

    const [milestone] = await transaction
      .update(projectMilestones)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(projectMilestones.id, milestoneId),
          eq(projectMilestones.projectId, project.id),
        ),
      )
      .returning();
    if (!milestone) {
      return null;
    }

    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.milestone.status_updated",
      resourceType: "project_milestone",
      resourceId: milestone.id,
      metadata: { projectId: project.id, status: milestone.status },
    });
    return milestone;
  });
}
