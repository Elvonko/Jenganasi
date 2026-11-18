"use client";

import {
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { ProjectMediaListItem } from "@/lib/project-media-service";

type GalleryFilter = "all" | "image" | "video" | "file";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function ProjectProgressGallery({
  projectId,
  items,
  showSharingStatus = false,
}: {
  projectId: string;
  items: ProjectMediaListItem[];
  showSharingStatus?: boolean;
}) {
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const categories: { id: GalleryFilter; label: string }[] = [
    { id: "all", label: `All updates (${items.length})` },
    { id: "image", label: `Photos (${items.filter((item) => item.category === "image").length})` },
    { id: "video", label: `Videos (${items.filter((item) => item.category === "video").length})` },
    { id: "file", label: `Files (${items.filter((item) => item.category === "file").length})` },
  ];
  const visibleItems =
    filter === "all" ? items : items.filter((item) => item.category === filter);

  return (
    <div className="progress-gallery">
      <div className="progress-gallery-filters" aria-label="Filter progress updates">
        {categories.map((category) => (
          <button
            aria-pressed={filter === category.id}
            className={filter === category.id ? "gallery-filter gallery-filter-active" : "gallery-filter"}
            key={category.id}
            onClick={() => setFilter(category.id)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>
      {visibleItems.length === 0 ? (
        <div className="gallery-empty">
          <ImageIcon size={22} aria-hidden="true" />
          <p>
            {items.length === 0
              ? "No progress updates have been shared yet."
              : "There are no updates in this category yet."}
          </p>
        </div>
      ) : (
        <div className="progress-gallery-grid">
          {visibleItems.map((item) => {
            const href = `/api/projects/${projectId}/media/${item.id}`;
            return (
              <article className="progress-media-card" key={item.id}>
                <div className="progress-media-preview">
                  {item.category === "image" ? (
                    <a href={href} target="_blank" rel="noreferrer" aria-label={`Open ${item.fileName}`}>
                      <Image
                        alt={item.caption || item.fileName}
                        height={300}
                        src={href}
                        unoptimized
                        width={440}
                      />
                    </a>
                  ) : item.category === "video" ? (
                    <video controls preload="metadata" src={href}>
                      Your browser does not support embedded video.
                    </video>
                  ) : (
                    <a className="progress-document-preview" download href={href}>
                      {item.contentType === "application/pdf" ? (
                        <FileText size={34} aria-hidden="true" />
                      ) : (
                        <FileIcon size={34} aria-hidden="true" />
                      )}
                      <span>Download file</span>
                    </a>
                  )}
                  {item.category === "video" && (
                    <span className="media-kind-badge"><Video size={13} aria-hidden="true" /> Video</span>
                  )}
                </div>
                <div className="progress-media-details">
                  <div className="progress-media-title">
                    <strong title={item.fileName}>{item.fileName}</strong>
                    {showSharingStatus && (
                      <span className={item.isShared ? "sharing-badge sharing-badge-public" : "sharing-badge"}>
                        {item.isShared ? "Shared with client" : "Team only"}
                      </span>
                    )}
                  </div>
                  {item.caption && <p>{item.caption}</p>}
                  <span>{formatDate(item.createdAt)} · {formatFileSize(item.fileSize)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
