"use client";

import { ImagePlus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { uploadProjectMedia } from "@/app/projects/media-actions";
import type { ProjectMediaListItem } from "@/lib/project-media-service";
import { ProjectProgressGallery } from "@/components/project-progress-gallery";

export function ProjectProgressMedia({
  projectId,
  items,
  canUpload,
}: {
  projectId: string;
  items: ProjectMediaListItem[];
  canUpload: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadProjectMedia, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <section className="panel project-progress-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">PROJECT PROGRESS</p>
          <h2>Photos, videos &amp; files <span className="work-count">{items.length}</span></h2>
          <p className="muted">
            Keep the customer up to date with on-site progress and documents.
          </p>
        </div>
      </div>
      {canUpload && (
        <form action={formAction} className="progress-upload-form" ref={formRef}>
          <input type="hidden" name="projectId" value={projectId} />
          <label className="field progress-file-field">
            <span>Add a progress photo, video or file</span>
            <input
              accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              name="file"
              required
              type="file"
            />
            <small className="field-hint">
              Images and documents up to 10 MB; videos up to 20 MB.
            </small>
          </label>
          <label className="field">
            <span>Update note <span className="muted">(optional)</span></span>
            <input
              maxLength={300}
              name="caption"
              placeholder="e.g. First-floor slab completed"
            />
          </label>
          <label className="progress-share-checkbox">
            <input name="shareWithClient" type="checkbox" />
            <span>
              <strong>Share with client</strong>
              <small>Only selected updates are visible in the client portal.</small>
            </span>
          </label>
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          {state.success && (
            <p className="form-success" role="status">Progress update uploaded.</p>
          )}
          <div className="form-actions">
            <button className="button button-primary" disabled={pending}>
              <ImagePlus size={16} aria-hidden="true" />
              {pending ? "Uploading…" : "Add update"}
            </button>
          </div>
        </form>
      )}
      <ProjectProgressGallery
        items={items}
        projectId={projectId}
        showSharingStatus={canUpload}
      />
    </section>
  );
}
