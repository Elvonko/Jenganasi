"use server";

import { revalidatePath } from "next/cache";
import { getCompanyContext, getSessionUser } from "@/lib/company-context";
import {
  acceptClientInvitation,
  addProjectMedia,
  inspectProjectMediaFile,
  inviteClientToProject,
  removeClientProjectAccess,
  revokeClientInvitation,
} from "@/lib/project-media-service";

export type ProjectMediaFormState = {
  error?: string;
  success?: boolean;
};

export type ClientInvitationFormState = {
  error?: string;
  invitationUrl?: string;
};

export async function uploadProjectMedia(
  _previousState: ProjectMediaFormState,
  formData: FormData,
): Promise<ProjectMediaFormState> {
  const projectId = formData.get("projectId");
  const file = formData.get("file");
  const caption = formData.get("caption");
  if (
    typeof projectId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(projectId) ||
    !(file instanceof File) ||
    typeof caption !== "string" ||
    caption.trim().length > 300
  ) {
    return { error: "Choose a file and check the progress update details." };
  }

  let inspectedFile;
  try {
    inspectedFile = await inspectProjectMediaFile(file);
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }

  const { actor } = await getCompanyContext("projects:update");
  await addProjectMedia(actor, projectId, {
    ...inspectedFile,
    caption: caption.trim(),
    isShared: formData.get("shareWithClient") === "on",
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/client-portal");
  return { success: true };
}

export async function createClientProjectInvitation(
  _previousState: ClientInvitationFormState,
  formData: FormData,
): Promise<ClientInvitationFormState> {
  const projectId = formData.get("projectId");
  if (typeof projectId !== "string" || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return { error: "Project not found." };
  }

  const { actor } = await getCompanyContext("projects:update");
  try {
    const invitation = await inviteClientToProject(actor, projectId);
    const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    revalidatePath(`/projects/${projectId}`);
    return {
      invitationUrl: new URL(
        `/client-invitations/${invitation.token}`,
        baseUrl,
      ).toString(),
    };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

export async function removeClientProjectAccessAction(
  formData: FormData,
): Promise<void> {
  const projectId = formData.get("projectId");
  const accessId = formData.get("accessId");
  if (
    typeof projectId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(projectId) ||
    typeof accessId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(accessId)
  ) {
    throw new Error("Project access record not found.");
  }

  const { actor } = await getCompanyContext("projects:update");
  const removed = await removeClientProjectAccess(actor, projectId, accessId);
  if (!removed) throw new Error("Project access record is no longer available.");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/client-portal");
}

export async function revokeClientInvitationAction(
  formData: FormData,
): Promise<void> {
  const projectId = formData.get("projectId");
  const invitationId = formData.get("invitationId");
  if (
    typeof projectId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(projectId) ||
    typeof invitationId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(invitationId)
  ) {
    throw new Error("Invitation not found.");
  }

  const { actor } = await getCompanyContext("projects:update");
  const revoked = await revokeClientInvitation(actor, invitationId);
  if (!revoked) throw new Error("Invitation is no longer active.");
  revalidatePath(`/projects/${projectId}`);
}

export async function acceptClientProjectInvitation(
  _previousState: ProjectMediaFormState,
  formData: FormData,
): Promise<ProjectMediaFormState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return { error: "This invitation link is invalid or has expired." };
  }

  const user = await getSessionUser();
  if (!user) return { error: "Sign in before accepting this invitation." };
  try {
    await acceptClientInvitation({ id: user.id, email: user.email }, token);
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
  revalidatePath("/client-portal");
  revalidatePath("/overview");
  return { success: true };
}
