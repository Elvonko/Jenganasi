import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  or,
} from "drizzle-orm";
import { db, ensureDatabase } from "@/db/client";
import {
  auditEvents,
  companies,
  customers,
  memberships,
  projectClientAccess,
  projectClientInvitations,
  projectMedia,
  projects,
  users,
} from "@/db/schema";
import { hasPermission, memberRoles } from "@/lib/permissions";
import { getObjectStorage } from "@/lib/object-storage";
import type { ProjectActor } from "@/lib/project-service";

export const MAX_PROJECT_MEDIA_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_OR_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 300;

const fileTypes = {
  ".jpg": { mime: "image/jpeg", category: "image", signature: "jpeg" },
  ".jpeg": { mime: "image/jpeg", category: "image", signature: "jpeg" },
  ".png": { mime: "image/png", category: "image", signature: "png" },
  ".gif": { mime: "image/gif", category: "image", signature: "gif" },
  ".webp": { mime: "image/webp", category: "image", signature: "webp" },
  ".mp4": { mime: "video/mp4", category: "video", signature: "mp4" },
  ".webm": { mime: "video/webm", category: "video", signature: "webm" },
  ".pdf": { mime: "application/pdf", category: "file", signature: "pdf" },
  ".doc": {
    mime: "application/msword",
    category: "file",
    signature: "ole",
  },
  ".xls": {
    mime: "application/vnd.ms-excel",
    category: "file",
    signature: "ole",
  },
  ".ppt": {
    mime: "application/vnd.ms-powerpoint",
    category: "file",
    signature: "ole",
  },
  ".docx": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "file",
    signature: "zip",
  },
  ".xlsx": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    category: "file",
    signature: "zip",
  },
  ".pptx": {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    category: "file",
    signature: "zip",
  },
  ".txt": { mime: "text/plain", category: "file", signature: "text" },
  ".csv": { mime: "text/csv", category: "file", signature: "text" },
} as const;

export type ProjectMediaCategory = "image" | "video" | "file";

export type ProjectMediaListItem = {
  id: string;
  fileName: string;
  contentType: string;
  category: ProjectMediaCategory;
  fileSize: number;
  caption: string;
  isShared: boolean;
  createdAt: Date;
};

export type ClientProjectListItem = {
  id: string;
  companyName: string;
  projectCode: string;
  name: string;
  location: string;
  status: string;
  progressPercent: number;
  targetDate: string | null;
};

export type ProjectClientAccessItem = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

function assertProjectPermission(actor: ProjectActor): void {
  if (!hasPermission(actor.role, "projects:update")) {
    throw new Error(`Role "${actor.role}" cannot upload or share project media.`);
  }
}

function cleanFileName(fileName: string): string {
  const name = fileName.replace(/^.*[\\/]/, "").replace(/[^\w .()\-]/g, "_");
  return name.slice(0, 180) || "progress-file";
}

function hasExpectedSignature(
  bytes: Uint8Array,
  signature: (typeof fileTypes)[keyof typeof fileTypes]["signature"],
): boolean {
  const startsWith = (...expected: number[]) =>
    expected.every((byte, index) => bytes[index] === byte);
  switch (signature) {
    case "jpeg":
      return startsWith(0xff, 0xd8, 0xff);
    case "png":
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "gif":
      return startsWith(0x47, 0x49, 0x46, 0x38);
    case "webp":
      return (
        bytes.length >= 12 &&
        startsWith(0x52, 0x49, 0x46, 0x46) &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    case "mp4":
      return (
        bytes.length >= 12 &&
        bytes[4] === 0x66 &&
        bytes[5] === 0x74 &&
        bytes[6] === 0x79 &&
        bytes[7] === 0x70
      );
    case "webm":
      return startsWith(0x1a, 0x45, 0xdf, 0xa3);
    case "pdf":
      return startsWith(0x25, 0x50, 0x44, 0x46, 0x2d);
    case "ole":
      return startsWith(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    case "zip":
      return startsWith(0x50, 0x4b, 0x03, 0x04);
    case "text":
      return (
        bytes.length > 0 &&
        !bytes.slice(0, 4096).some((byte) => byte === 0)
      );
  }
}

export async function inspectProjectMediaFile(file: File): Promise<{
  fileName: string;
  contentType: string;
  category: ProjectMediaCategory;
  fileSize: number;
  data: Uint8Array;
}> {
  const extension = file.name.match(/\.[^.]+$/)?.[0].toLowerCase();
  const definition = extension
    ? fileTypes[extension as keyof typeof fileTypes]
    : undefined;
  if (!definition || file.type !== definition.mime) {
    throw new Error("Choose a supported image, video or document file.");
  }
  const maxSize =
    definition.category === "video"
      ? MAX_PROJECT_MEDIA_BYTES
      : MAX_IMAGE_OR_DOCUMENT_BYTES;
  if (file.size === 0 || file.size > maxSize) {
    throw new Error(
      definition.category === "video"
        ? "Videos must be no larger than 20 MB."
        : "Images and documents must be no larger than 10 MB.",
    );
  }
  const data = new Uint8Array(await file.arrayBuffer());
  if (!hasExpectedSignature(data, definition.signature)) {
    throw new Error("The file contents do not match the selected file type.");
  }

  return {
    fileName: cleanFileName(file.name),
    contentType: definition.mime,
    category: definition.category,
    fileSize: data.byteLength,
    data,
  };
}

export async function addProjectMedia(
  actor: ProjectActor,
  projectId: string,
  input: {
    fileName: string;
    contentType: string;
    category: ProjectMediaCategory;
    fileSize: number;
    data: Uint8Array;
    caption: string;
    isShared: boolean;
  },
): Promise<ProjectMediaListItem> {
  assertProjectPermission(actor);
  await ensureDatabase();
  const [project] = await db
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
  if (!project) throw new Error("Project not found or no longer available.");
  if (
    input.caption.length > MAX_CAPTION_LENGTH ||
    input.fileSize !== input.data.byteLength
  ) {
    throw new Error("The progress update details are invalid.");
  }

  const storageKey = `${actor.companyId}/${projectId}/${randomUUID()}`;
  const storage = await getObjectStorage();
  await storage.put(storageKey, input.data, input.contentType);
  const metadata = {
    fileName: input.fileName,
    contentType: input.contentType,
    category: input.category,
    fileSize: input.fileSize,
    caption: input.caption,
    isShared: input.isShared,
  };

  return db.transaction(async (transaction) => {
    const [media] = await transaction
      .insert(projectMedia)
      .values({
        id: randomUUID(),
        companyId: actor.companyId,
        projectId,
        ...metadata,
        storageKey,
        uploadedBy: actor.userId,
      })
      .returning({
        id: projectMedia.id,
        fileName: projectMedia.fileName,
        contentType: projectMedia.contentType,
        category: projectMedia.category,
        fileSize: projectMedia.fileSize,
        caption: projectMedia.caption,
        isShared: projectMedia.isShared,
        createdAt: projectMedia.createdAt,
      });
    if (!media) throw new Error("The progress file could not be saved.");
    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.media_uploaded",
      resourceType: "project_media",
      resourceId: media.id,
      metadata: {
        projectId,
        category: media.category,
        sharedWithClient: media.isShared,
      },
    });
    return media as ProjectMediaListItem;
  });
}

export async function listProjectMedia(
  actor: ProjectActor,
  projectId: string,
): Promise<ProjectMediaListItem[]> {
  if (!hasPermission(actor.role, "projects:read")) {
    throw new Error(`Role "${actor.role}" cannot view project media.`);
  }
  await ensureDatabase();
  return db
    .select({
      id: projectMedia.id,
      fileName: projectMedia.fileName,
      contentType: projectMedia.contentType,
      category: projectMedia.category,
      fileSize: projectMedia.fileSize,
      caption: projectMedia.caption,
      isShared: projectMedia.isShared,
      createdAt: projectMedia.createdAt,
    })
    .from(projectMedia)
    .innerJoin(projects, eq(projectMedia.projectId, projects.id))
    .where(
      and(
        eq(projectMedia.projectId, projectId),
        eq(projectMedia.companyId, actor.companyId),
        eq(projects.companyId, actor.companyId),
      ),
    )
    .orderBy(desc(projectMedia.createdAt));
}

export async function listClientProjects(
  userId: string,
): Promise<ClientProjectListItem[]> {
  await ensureDatabase();
  return db
    .select({
      id: projects.id,
      companyName: companies.name,
      projectCode: projects.projectCode,
      name: projects.name,
      location: projects.location,
      status: projects.status,
      progressPercent: projects.progressPercent,
      targetDate: projects.targetDate,
    })
    .from(projectClientAccess)
    .innerJoin(
      projects,
      and(
        eq(projectClientAccess.projectId, projects.id),
        eq(projectClientAccess.companyId, projects.companyId),
      ),
    )
    .innerJoin(companies, eq(projects.companyId, companies.id))
    .where(
      and(
        eq(projectClientAccess.userId, userId),
        ne(projects.status, "archived"),
      ),
    )
    .orderBy(asc(companies.name), asc(projects.name));
}

export async function getClientProject(userId: string, projectId: string) {
  await ensureDatabase();
  const [project] = await db
    .select({
      id: projects.id,
      companyName: companies.name,
      projectCode: projects.projectCode,
      name: projects.name,
      location: projects.location,
      status: projects.status,
      progressPercent: projects.progressPercent,
      startDate: projects.startDate,
      targetDate: projects.targetDate,
    })
    .from(projectClientAccess)
    .innerJoin(
      projects,
      and(
        eq(projectClientAccess.projectId, projects.id),
        eq(projectClientAccess.companyId, projects.companyId),
      ),
    )
    .innerJoin(companies, eq(projects.companyId, companies.id))
    .where(
      and(
        eq(projectClientAccess.userId, userId),
        eq(projects.id, projectId),
        neArchivedProject(),
      ),
    )
    .limit(1);
  return project ?? null;
}

function neArchivedProject() {
  return ne(projects.status, "archived");
}

export async function listClientProjectMedia(
  userId: string,
  projectId: string,
): Promise<ProjectMediaListItem[]> {
  await ensureDatabase();
  return db
    .select({
      id: projectMedia.id,
      fileName: projectMedia.fileName,
      contentType: projectMedia.contentType,
      category: projectMedia.category,
      fileSize: projectMedia.fileSize,
      caption: projectMedia.caption,
      isShared: projectMedia.isShared,
      createdAt: projectMedia.createdAt,
    })
    .from(projectMedia)
    .innerJoin(
      projectClientAccess,
      and(
        eq(projectMedia.projectId, projectClientAccess.projectId),
        eq(projectMedia.companyId, projectClientAccess.companyId),
      ),
    )
    .where(
      and(
        eq(projectClientAccess.userId, userId),
        eq(projectMedia.projectId, projectId),
        eq(projectMedia.isShared, true),
      ),
    )
    .orderBy(desc(projectMedia.createdAt));
}

export async function getProjectMediaForUser(
  userId: string,
  projectId: string,
  mediaId: string,
) {
  await ensureDatabase();
  const readableStaffRoles = memberRoles.filter((role) =>
    hasPermission(role, "projects:read"),
  );
  const [media] = await db
    .select({
      data: projectMedia.data,
      storageKey: projectMedia.storageKey,
      contentType: projectMedia.contentType,
      fileName: projectMedia.fileName,
      category: projectMedia.category,
      isShared: projectMedia.isShared,
      role: memberships.role,
      accessId: projectClientAccess.id,
    })
    .from(projectMedia)
    .innerJoin(projects, eq(projectMedia.projectId, projects.id))
    .innerJoin(
      memberships,
      and(
        eq(memberships.companyId, projects.companyId),
        eq(memberships.userId, userId),
      ),
    )
    .leftJoin(
      projectClientAccess,
      and(
        eq(projectClientAccess.projectId, projects.id),
        eq(projectClientAccess.companyId, projects.companyId),
        eq(projectClientAccess.userId, userId),
      ),
    )
    .where(
      and(
        eq(projectMedia.id, mediaId),
        eq(projectMedia.projectId, projectId),
        ne(projects.status, "archived"),
        or(
          inArray(memberships.role, [...readableStaffRoles]),
          and(
            eq(memberships.role, "client"),
            eq(projectMedia.isShared, true),
            eq(projectClientAccess.userId, userId),
          ),
        ),
      ),
    )
    .limit(1);
  if (!media) return null;
  if (
    media.role === "client" &&
    (media.accessId === null || !media.isShared)
  ) {
    return null;
  }
  if (
    media.category === "image" &&
    !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
      media.contentType,
    )
  ) {
    return null;
  }
  if (
    media.category === "video" &&
    !["video/mp4", "video/webm"].includes(media.contentType)
  ) {
    return null;
  }
  return media;
}

export async function resolveProjectMediaDownload(
  media: NonNullable<Awaited<ReturnType<typeof getProjectMediaForUser>>>,
): Promise<{ bytes?: Uint8Array; redirectUrl?: string }> {
  if (
    media.storageKey &&
    !media.storageKey.startsWith("legacy:") &&
    media.data === null
  ) {
    const storage = await getObjectStorage();
    return {
      redirectUrl: await storage.signedGetUrl(
        media.storageKey,
        media.contentType,
      ),
    };
  }
  return { bytes: media.data ?? new Uint8Array() };
}

export async function inviteClientToProject(
  actor: ProjectActor,
  projectId: string,
): Promise<{ email: string; token: string }> {
  if (!hasPermission(actor.role, "projects:update")) {
    throw new Error(`Role "${actor.role}" cannot share project access.`);
  }
  await ensureDatabase();
  const [project] = await db
    .select({
      id: projects.id,
      customerEmail: customers.email,
    })
    .from(projects)
    .leftJoin(
      customers,
      and(
        eq(projects.customerId, customers.id),
        eq(projects.companyId, customers.companyId),
      ),
    )
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.companyId, actor.companyId),
        neArchivedProject(),
      ),
    )
    .limit(1);
  if (!project) throw new Error("Project not found or no longer available.");
  if (!project.customerEmail) {
    throw new Error(
      "Add an email address to the linked customer before inviting them.",
    );
  }

  const email = project.customerEmail.trim().toLowerCase();
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  await db.transaction(async (transaction) => {
    await transaction
      .update(projectClientInvitations)
      .set({ revokedAt: now })
      .where(
        and(
          eq(projectClientInvitations.companyId, actor.companyId),
          eq(projectClientInvitations.projectId, projectId),
          eq(projectClientInvitations.email, email),
          isNull(projectClientInvitations.acceptedAt),
          isNull(projectClientInvitations.revokedAt),
        ),
      );
    await transaction.insert(projectClientInvitations).values({
      id: randomUUID(),
      companyId: actor.companyId,
      projectId,
      email,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdBy: actor.userId,
    });
    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.client_invited",
      resourceType: "project",
      resourceId: projectId,
      metadata: { email },
    });
  });
  return { email, token };
}

export type ClientInvitationItem = {
  id: string;
  email: string;
  expiresAt: Date;
};

export async function listPendingClientInvitations(
  actor: ProjectActor,
  projectId: string,
): Promise<ClientInvitationItem[]> {
  if (!hasPermission(actor.role, "projects:update")) {
    throw new Error(`Role "${actor.role}" cannot manage invitations.`);
  }
  await ensureDatabase();
  return db
    .select({
      id: projectClientInvitations.id,
      email: projectClientInvitations.email,
      expiresAt: projectClientInvitations.expiresAt,
    })
    .from(projectClientInvitations)
    .where(
      and(
        eq(projectClientInvitations.companyId, actor.companyId),
        eq(projectClientInvitations.projectId, projectId),
        isNull(projectClientInvitations.acceptedAt),
        isNull(projectClientInvitations.revokedAt),
        gt(projectClientInvitations.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(projectClientInvitations.expiresAt));
}

export async function revokeClientInvitation(
  actor: ProjectActor,
  invitationId: string,
): Promise<boolean> {
  if (!hasPermission(actor.role, "projects:update")) {
    throw new Error(`Role "${actor.role}" cannot manage invitations.`);
  }
  await ensureDatabase();
  const revoked = await db
    .update(projectClientInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(projectClientInvitations.id, invitationId),
        eq(projectClientInvitations.companyId, actor.companyId),
        isNull(projectClientInvitations.revokedAt),
      ),
    )
    .returning({
      projectId: projectClientInvitations.projectId,
      email: projectClientInvitations.email,
    });
  const invitation = revoked[0];
  if (!invitation) return false;

  await db.insert(auditEvents).values({
    id: randomUUID(),
    companyId: actor.companyId,
    actorUserId: actor.userId,
    action: "project.client_invitation_revoked",
    resourceType: "project",
    resourceId: invitation.projectId,
    metadata: { email: invitation.email },
  });
  return true;
}

export async function acceptClientInvitation(
  user: { id: string; email: string },
  token: string,
): Promise<void> {
  await ensureDatabase();
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new Error("This invitation link is invalid or has expired.");
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  await db.transaction(async (transaction) => {
    const [invitation] = await transaction
      .select()
      .from(projectClientInvitations)
      .where(
        and(
          eq(projectClientInvitations.tokenHash, tokenHash),
          gt(projectClientInvitations.expiresAt, now),
          isNull(projectClientInvitations.acceptedAt),
          isNull(projectClientInvitations.revokedAt),
        ),
      )
      .limit(1);
    if (
      !invitation ||
      invitation.email !== user.email.trim().toLowerCase()
    ) {
      throw new Error(
        "Sign in with the email address this project invitation was sent to.",
      );
    }

    const [membership] = await transaction
      .select({ role: memberships.role })
      .from(memberships)
      .where(
        and(
          eq(memberships.companyId, invitation.companyId),
          eq(memberships.userId, user.id),
        ),
      )
      .limit(1);
    if (membership && membership.role !== "client") {
      throw new Error(
        "This account already has a team role in the construction company. Use a separate client account to accept this invitation.",
      );
    }
    if (!membership) {
      await transaction.insert(memberships).values({
        id: randomUUID(),
        companyId: invitation.companyId,
        userId: user.id,
        role: "client",
      });
    }
    await transaction
      .insert(projectClientAccess)
      .values({
        id: randomUUID(),
        companyId: invitation.companyId,
        projectId: invitation.projectId,
        userId: user.id,
        grantedBy: invitation.createdBy,
      })
      .onConflictDoNothing();
    const [accepted] = await transaction
      .update(projectClientInvitations)
      .set({ acceptedAt: now })
      .where(
        and(
          eq(projectClientInvitations.id, invitation.id),
          isNull(projectClientInvitations.acceptedAt),
          isNull(projectClientInvitations.revokedAt),
        ),
      )
      .returning({ id: projectClientInvitations.id });
    if (!accepted) {
      throw new Error("This invitation link has already been used.");
    }
    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: invitation.companyId,
      actorUserId: user.id,
      action: "project.client_access_granted",
      resourceType: "project",
      resourceId: invitation.projectId,
      metadata: { email: invitation.email },
    });
  });
}

export async function listProjectClientAccess(
  actor: ProjectActor,
  projectId: string,
): Promise<ProjectClientAccessItem[]> {
  if (!hasPermission(actor.role, "projects:read")) {
    throw new Error(`Role "${actor.role}" cannot view project access.`);
  }
  await ensureDatabase();
  return db
    .select({
      id: projectClientAccess.id,
      name: users.name,
      email: users.email,
      createdAt: projectClientAccess.createdAt,
    })
    .from(projectClientAccess)
    .innerJoin(users, eq(projectClientAccess.userId, users.id))
    .where(
      and(
        eq(projectClientAccess.projectId, projectId),
        eq(projectClientAccess.companyId, actor.companyId),
      ),
    )
    .orderBy(asc(users.name));
}

export async function removeClientProjectAccess(
  actor: ProjectActor,
  projectId: string,
  accessId: string,
): Promise<boolean> {
  if (!hasPermission(actor.role, "projects:update")) {
    throw new Error(`Role "${actor.role}" cannot change project access.`);
  }
  await ensureDatabase();
  return db.transaction(async (transaction) => {
    const [removed] = await transaction
      .delete(projectClientAccess)
      .where(
        and(
          eq(projectClientAccess.id, accessId),
          eq(projectClientAccess.companyId, actor.companyId),
          eq(projectClientAccess.projectId, projectId),
        ),
      )
      .returning({
        id: projectClientAccess.id,
        userId: projectClientAccess.userId,
      });
    if (!removed) return false;
    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "project.client_access_revoked",
      resourceType: "project",
      resourceId: projectId,
      metadata: { userId: removed.userId },
    });
    return true;
  });
}
