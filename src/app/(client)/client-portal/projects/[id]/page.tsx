import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectProgressGallery } from "@/components/project-progress-gallery";
import { getSessionUser } from "@/lib/company-context";
import {
  getClientProject,
  listClientProjectMedia,
} from "@/lib/project-media-service";

export default async function ClientProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const project = await getClientProject(user.id, id);
  if (!project) notFound();
  const media = await listClientProjectMedia(user.id, project.id);

  return (
    <div className="client-page-stack">
      <Link className="client-back-link" href="/client-portal">
        <ArrowLeft size={16} aria-hidden="true" /> All projects
      </Link>
      <section className="client-project-hero">
        <div>
          <p className="eyebrow">{project.companyName} · {project.projectCode}</p>
          <h1>{project.name}</h1>
          <span className={`status-pill status-${project.status}`}>{project.status.replaceAll("_", " ")}</span>
        </div>
        <div className="client-project-facts">
          <span><MapPin size={16} aria-hidden="true" />{project.location || "Location not provided"}</span>
          <span><CalendarDays size={16} aria-hidden="true" />{project.targetDate ? `Target ${project.targetDate}` : "No target completion date"}</span>
        </div>
        <div className="client-project-progress client-project-progress-hero">
          <div className="client-project-progress-copy">
            <strong>Project progress</strong>
            <span>{project.progressPercent}% complete</span>
          </div>
          <div className="progress-track" role="progressbar" aria-label="Project progress" aria-valuenow={project.progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${project.progressPercent}%` }} />
          </div>
        </div>
      </section>
      <section className="panel project-progress-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SHARED BY YOUR CONSTRUCTION TEAM</p>
            <h2>Progress updates <span className="work-count">{media.length}</span></h2>
            <p className="muted">Photos, videos and project files published for you.</p>
          </div>
        </div>
        <ProjectProgressGallery items={media} projectId={project.id} />
      </section>
    </div>
  );
}
