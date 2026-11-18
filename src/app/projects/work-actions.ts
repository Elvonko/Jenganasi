"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCompanyContext } from "@/lib/company-context";
import {
  assignProjectTask as assignProjectTaskRecord,
  createProjectTaskDependency as createProjectTaskDependencyRecord,
  createProjectPhase,
  createProjectMilestone,
  createProjectTask,
  projectPhaseInputSchema,
  projectPhaseStatusSchema,
  projectMilestoneInputSchema,
  projectMilestoneStatusSchema,
  projectTaskAssignmentInputSchema,
  projectTaskDependencyInputSchema,
  projectTaskDependencyRemovalInputSchema,
  projectTaskInputSchema,
  projectTaskPhaseInputSchema,
  projectTaskStatusSchema,
  updateProjectPhaseStatus as updateProjectPhaseStatusRecord,
  updateProjectTaskPhase as updateProjectTaskPhaseRecord,
  updateProjectMilestoneStatus as updateProjectMilestoneStatusRecord,
  updateProjectTaskStatus as updateProjectTaskStatusRecord,
  removeProjectTaskDependency as removeProjectTaskDependencyRecord,
} from "@/lib/project-work-service";

export type ProjectWorkFormState = {
  error?: string;
};

const uuidSchema = z.string().uuid();

export async function createProjectTaskAction(
  _previousState: ProjectWorkFormState,
  formData: FormData,
): Promise<ProjectWorkFormState> {
  const parsed = projectTaskInputSchema.safeParse({
    projectId: formData.get("projectId"),
    phaseId: formData.get("phaseId") ?? "",
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    assigneeId: formData.get("assigneeId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the task details." };
  }

  const { actor } = await getCompanyContext("projects:update");
  await createProjectTask(actor, parsed.data);
  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/projects");
  return {};
}

export async function createProjectPhaseAction(
  _previousState: ProjectWorkFormState,
  formData: FormData,
): Promise<ProjectWorkFormState> {
  const parsed = projectPhaseInputSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("title"),
    description: formData.get("description") ?? "",
    targetDate: formData.get("targetDate") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the phase details." };
  }

  const { actor } = await getCompanyContext("projects:update");
  await createProjectPhase(actor, parsed.data);
  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/projects");
  return {};
}

export async function updateProjectPhaseStatus(
  formData: FormData,
): Promise<void> {
  const projectId = formData.get("projectId");
  const phaseId = formData.get("phaseId");
  const status = projectPhaseStatusSchema.safeParse(formData.get("status"));
  if (
    typeof projectId !== "string" ||
    !uuidSchema.safeParse(projectId).success ||
    typeof phaseId !== "string" ||
    !uuidSchema.safeParse(phaseId).success ||
    !status.success
  ) {
    throw new Error("Phase not found or status is invalid.");
  }

  const { actor } = await getCompanyContext("projects:update");
  const phase = await updateProjectPhaseStatusRecord(
    actor,
    projectId,
    phaseId,
    status.data,
  );
  if (!phase) throw new Error("Phase not found or no longer available.");
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectTaskPhase(
  formData: FormData,
): Promise<void> {
  const parsed = projectTaskPhaseInputSchema.safeParse({
    projectId: formData.get("projectId"),
    taskId: formData.get("taskId"),
    phaseId: formData.get("phaseId") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Task phase is invalid.");
  }

  const { actor } = await getCompanyContext("projects:update");
  const task = await updateProjectTaskPhaseRecord(
    actor,
    parsed.data.projectId,
    parsed.data.taskId,
    parsed.data.phaseId || null,
  );
  if (!task) throw new Error("Task not found or no longer available.");
  revalidatePath(`/projects/${parsed.data.projectId}`);
}

export async function updateProjectTaskStatus(
  formData: FormData,
): Promise<void> {
  const projectId = formData.get("projectId");
  const taskId = formData.get("taskId");
  const status = projectTaskStatusSchema.safeParse(formData.get("status"));
  if (
    typeof projectId !== "string" ||
    !uuidSchema.safeParse(projectId).success ||
    typeof taskId !== "string" ||
    !uuidSchema.safeParse(taskId).success ||
    !status.success
  ) {
    throw new Error("Task not found or status is invalid.");
  }

  const { actor } = await getCompanyContext("projects:update");
  const task = await updateProjectTaskStatusRecord(
    actor,
    projectId,
    taskId,
    status.data,
  );
  if (!task) {
    throw new Error("Task not found or no longer available.");
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function assignProjectTask(formData: FormData): Promise<void> {
  const parsed = projectTaskAssignmentInputSchema.safeParse({
    projectId: formData.get("projectId"),
    taskId: formData.get("taskId"),
    assigneeId: formData.get("assigneeId") ?? "",
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Task assignment is invalid.",
    );
  }

  const { actor } = await getCompanyContext("projects:update");
  const task = await assignProjectTaskRecord(
    actor,
    parsed.data.projectId,
    parsed.data.taskId,
    parsed.data.assigneeId || null,
  );
  if (!task) {
    throw new Error("Task not found or no longer available.");
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
}

export async function createProjectTaskDependency(
  formData: FormData,
): Promise<void> {
  const parsed = projectTaskDependencyInputSchema.safeParse({
    projectId: formData.get("projectId"),
    predecessorTaskId: formData.get("predecessorTaskId"),
    successorTaskId: formData.get("successorTaskId"),
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Task dependency is invalid.",
    );
  }

  const { actor } = await getCompanyContext("projects:update");
  await createProjectTaskDependencyRecord(actor, parsed.data);
  revalidatePath(`/projects/${parsed.data.projectId}`);
}

export async function removeProjectTaskDependency(
  formData: FormData,
): Promise<void> {
  const parsed = projectTaskDependencyRemovalInputSchema.safeParse({
    projectId: formData.get("projectId"),
    dependencyId: formData.get("dependencyId"),
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Task dependency is invalid.",
    );
  }

  const { actor } = await getCompanyContext("projects:update");
  const removed = await removeProjectTaskDependencyRecord(
    actor,
    parsed.data.projectId,
    parsed.data.dependencyId,
  );
  if (!removed) throw new Error("Task dependency not found or unavailable.");
  revalidatePath(`/projects/${parsed.data.projectId}`);
}

export async function createProjectMilestoneAction(
  _previousState: ProjectWorkFormState,
  formData: FormData,
): Promise<ProjectWorkFormState> {
  const parsed = projectMilestoneInputSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    targetDate: formData.get("targetDate") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the milestone details.",
    };
  }

  const { actor } = await getCompanyContext("projects:update");
  await createProjectMilestone(actor, parsed.data);
  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/projects");
  return {};
}

export async function updateProjectMilestoneStatus(
  formData: FormData,
): Promise<void> {
  const projectId = formData.get("projectId");
  const milestoneId = formData.get("milestoneId");
  const status = projectMilestoneStatusSchema.safeParse(
    formData.get("status"),
  );
  if (
    typeof projectId !== "string" ||
    !uuidSchema.safeParse(projectId).success ||
    typeof milestoneId !== "string" ||
    !uuidSchema.safeParse(milestoneId).success ||
    !status.success
  ) {
    throw new Error("Milestone not found or status is invalid.");
  }

  const { actor } = await getCompanyContext("projects:update");
  const milestone = await updateProjectMilestoneStatusRecord(
    actor,
    projectId,
    milestoneId,
    status.data,
  );
  if (!milestone) {
    throw new Error("Milestone not found or no longer available.");
  }

  revalidatePath(`/projects/${projectId}`);
}
