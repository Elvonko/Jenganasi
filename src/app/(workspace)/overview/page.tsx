import { ArrowRight, CircleCheck, Clock3, FolderKanban, PauseCircle } from "lucide-react";
import Link from "next/link";
import { getCompanyContext } from "@/lib/company-context";
import { listProjects } from "@/lib/project-service";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const context = await getCompanyContext();
  if (context.actor.role === "client") redirect("/client-portal");
  if (!hasPermission(context.actor.role, "projects:read")) redirect("/forbidden");
  const projects = await listProjects(context.actor);
  const active = projects.filter((project) => project.status === "in_progress");
  const planned = projects.filter((project) => project.status === "planned");
  const paused = projects.filter((project) => project.status === "on_hold");
  const averageProgress =
    projects.length === 0
      ? 0
      : Math.round(
          projects.reduce((total, project) => total + project.progressPercent, 0) /
            projects.length,
        );
  const canCreate = hasPermission(context.actor.role, "projects:create");
  const currentDate = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: context.company.timezone,
  }).format(new Date());

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{currentDate}</p>
          <h1>Good work starts with a clear view.</h1>
          <p className="muted">
            Here’s what’s happening across {context.company.name}.
          </p>
        </div>
        {canCreate && (
          <Link className="button button-primary" href="/projects/new">
            <span className="button-plus" aria-hidden="true">+</span>
            New project
          </Link>
        )}
      </section>

      <section className="metric-grid" aria-label="Project overview">
        <article className="metric-card">
          <span className="metric-icon metric-icon-yellow">
            <FolderKanban size={18} aria-hidden="true" />
          </span>
          <span className="metric-label">Active projects</span>
          <strong className="metric-value">{active.length}</strong>
          <span className="metric-note">Currently on site</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-blue">
            <Clock3 size={18} aria-hidden="true" />
          </span>
          <span className="metric-label">Planned</span>
          <strong className="metric-value">{planned.length}</strong>
          <span className="metric-note">Ready to get moving</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-green">
            <CircleCheck size={18} aria-hidden="true" />
          </span>
          <span className="metric-label">Average progress</span>
          <strong className="metric-value">{averageProgress}%</strong>
          <span className="metric-note">Across visible projects</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-slate">
            <PauseCircle size={18} aria-hidden="true" />
          </span>
          <span className="metric-label">On hold</span>
          <strong className="metric-value">{paused.length}</strong>
          <span className="metric-note">Projects needing a check-in</span>
        </article>
      </section>

      <section className="panel project-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">YOUR WORK</p>
            <h2>Projects</h2>
          </div>
          <Link className="text-link" href="/projects">
            View all <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <FolderKanban size={22} aria-hidden="true" />
            </span>
            <h3>Your first project starts here.</h3>
            <p>
              Add a project to give your team one place for scope, status and
              progress.
            </p>
            {canCreate && (
              <Link className="button button-secondary" href="/projects/new">
                Create a project <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Location</th>
                  <th scope="col">Status</th>
                  <th scope="col">Progress</th>
                  <th scope="col">Target date</th>
                  <th scope="col"><span className="sr-only">Open project</span></th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 6).map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link className="project-name-link" href={`/projects/${project.id}`}>
                        <span className="project-code">{project.projectCode}</span>
                        <strong>{project.name}</strong>
                      </Link>
                    </td>
                    <td>{project.location || "—"}</td>
                    <td>
                      <span className={`status-pill status-${project.status}`}>
                        {project.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-label={`${project.name} progress`}
                          aria-valuenow={project.progressPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span style={{ width: `${project.progressPercent}%` }} />
                        </div>
                        <span>{project.progressPercent}%</span>
                      </div>
                    </td>
                    <td>
                      {project.targetDate
                        ? new Intl.DateTimeFormat("en-KE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(`${project.targetDate}T00:00:00`))
                        : "Not set"}
                    </td>
                    <td>
                      <Link
                        className="row-action"
                        href={`/projects/${project.id}`}
                        aria-label={`Open ${project.name}`}
                      >
                        <ArrowRight size={17} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
