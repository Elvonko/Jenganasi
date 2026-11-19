import { ArrowRight, Building2, FolderKanban } from "lucide-react";
import Link from "next/link";
import { getSessionUser } from "@/lib/company-context";
import { listClientProjects } from "@/lib/project-media-service";

export default async function ClientPortalPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const projects = await listClientProjects(user.id);

  return (
    <div className="client-page-stack">
      <section className="client-welcome">
        <p className="eyebrow">YOUR CLIENT PORTAL</p>
        <h1>Project progress, in one place.</h1>
        <p>View the latest photos, videos and files your construction team has shared.</p>
        <Link className="client-help-inline" href="/help?audience=customer&returnTo=/client-portal">
          New here? Read the client guide →
        </Link>
      </section>
      <section className="client-project-list" aria-labelledby="client-project-heading">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SHARED PROJECTS</p>
            <h2 id="client-project-heading">Your projects <span className="work-count">{projects.length}</span></h2>
          </div>
        </div>
        {projects.length === 0 ? (
          <div className="gallery-empty client-project-empty">
            <FolderKanban size={24} aria-hidden="true" />
            <h3>No projects shared yet</h3>
            <p>When your construction team invites you, shared project updates will appear here.</p>
          </div>
        ) : (
          <div className="client-project-grid">
            {projects.map((project) => (
              <Link
                className="client-project-card"
                href={`/client-portal/projects/${project.id}`}
                key={`${project.id}-${project.companyName}`}
              >
                <div className="client-project-card-top">
                  <span className="client-company"><Building2 size={15} aria-hidden="true" />{project.companyName}</span>
                  <span className={`status-pill status-${project.status}`}>{project.status.replaceAll("_", " ")}</span>
                </div>
                <span className="project-code">{project.projectCode}</span>
                <strong>{project.name}</strong>
                <span className="muted">{project.location || "Location not provided"}</span>
                <div className="client-project-progress">
                  <div className="progress-track" role="progressbar" aria-label={`${project.name} progress`} aria-valuenow={project.progressPercent} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${project.progressPercent}%` }} />
                  </div>
                  <span>{project.progressPercent}% complete</span>
                </div>
                <span className="client-project-open">View progress <ArrowRight size={16} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
