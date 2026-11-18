"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCompanyContext } from "@/lib/company-context";
import {
  archiveProject as archiveProjectRecord,
  createProject as createProjectRecord,
  ProjectLimitError,
  projectInputSchema,
  updateProject as updateProjectRecord,
} from "@/lib/project-service";

export type ProjectFormState = {
  error?: string;
};

function parseProjectForm(formData: FormData) {
  return projectInputSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location") ?? "",
    customerId: formData.get("customerId") ?? "",
    templateId: formData.get("templateId") ?? "",
    status: formData.get("status") ?? "planned",
    progressPercent: formData.get("progressPercent") ?? 0,
    startDate: formData.get("startDate") ?? "",
    targetDate: formData.get("targetDate") ?? "",
  });
}

export async function createProject(
  _previousState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const parsed = parseProjectForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the project details." };
  }

  const { actor } = await getCompanyContext("projects:create");
  let project;
  try {
    project = await createProjectRecord(actor, parsed.data);
  } catch (error) {
    if (error instanceof ProjectLimitError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/overview");
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(
  _previousState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || !z.string().uuid().safeParse(id).success) {
    return { error: "Project not found." };
  }

  const parsed = parseProjectForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the project details." };
  }

  const { actor } = await getCompanyContext("projects:update");
  const project = await updateProjectRecord(actor, id, parsed.data);
  if (!project) {
    return { error: "Project not found or no longer available." };
  }
  revalidatePath("/overview");
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return {};
}

export async function archiveProject(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || !z.string().uuid().safeParse(id).success) {
    redirect("/projects");
  }

  const { actor } = await getCompanyContext("projects:archive");
  const archived = await archiveProjectRecord(actor, id);
  if (!archived) {
    redirect("/projects");
  }

  revalidatePath("/overview");
  revalidatePath("/projects");
  redirect("/projects");
}
