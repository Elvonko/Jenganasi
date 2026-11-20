import { getSessionUser } from "@/lib/company-context";
import {
  getProjectMediaForUser,
  resolveProjectMediaDownload,
} from "@/lib/project-media-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; mediaId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { projectId, mediaId } = await params;
  if (
    !/^[0-9a-f-]{36}$/i.test(projectId) ||
    !/^[0-9a-f-]{36}$/i.test(mediaId)
  ) {
    return new Response("Not found", { status: 404 });
  }

  const media = await getProjectMediaForUser(user.id, projectId, mediaId);
  if (!media) return new Response("Not found", { status: 404 });

  const resolved = await resolveProjectMediaDownload(media);
  if (resolved.redirectUrl) {
    return Response.redirect(resolved.redirectUrl, 302);
  }

  const bytes = resolved.bytes ?? new Uint8Array();
  const disposition =
    media.category === "image" || media.category === "video"
      ? "inline"
      : "attachment";
  const encodedName = encodeURIComponent(media.fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(bytes.byteLength),
      "Content-Type": media.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
