import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { getCompanyContext } from "@/lib/company-context";
import { hasPermission } from "@/lib/permissions";
import { getPricingPlan } from "@/lib/pricing";
import { getProjectUsage, listProjects } from "@/lib/project-service";

export default async function ProjectsPage() {
  const context = await getCompanyContext("projects:read");
  const [projects, projectUsage] = await Promise.all([
    listProjects(context.actor),
    getProjectUsage(context.actor),
  ]);
  const plan = getPricingPlan(context.company.planCode);
  const canCreate = hasPermission(context.actor.role, "projects:create");

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">PROJECT REGISTER</p>
          <h1>Projects</h1>
          <p className="muted">
            A current view of the work your company is delivering.
          </p>
        </div>
        {canCreate && (
          <Link className="button button-primary" href="/projects/new">
            <Plus size={17} aria-hidden="true" />
            New project
          </Link>
        )}
      </section>

      <section className="project-plan-summary" aria-label="Project plan usage">
        <div>
          <p className="eyebrow">CURRENT PLAN · {plan.name.toUpperCase()}</p>
          <strong>
            {projectUsage} {projectUsage === 1 ? "project" : "projects"}
            {plan.projectLimit === null ? " · unlimited" : ` of ${plan.projectLimit} used`}
          </strong>
          <p>Archived projects count toward your project allowance.</p>
        </div>
        <Link className="button button-secondary" href="/pricing">
          View plans
        </Link>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ALL PROJECTS</p>
            <h2>{projects.length} visible</h2>
          </div>
          <span className="table-caption">
            Archived work is kept out of this register.
          </span>
        </div>
        {projects.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <FolderKanban size={22} aria-hidden="true" />
            </span>
            <h3>No projects yet.</h3>
            <p>Create a project to start organizing your company’s work.</p>
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
                  <th scope="col">Start</th>
                  <th scope="col">Target</th>
                  <th scope="col"><span className="sr-only">Open project</span></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link
                        className="project-name-link"
                        href={`/projects/${project.id}`}
                      >
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
                    <td>{project.startDate ?? "—"}</td>
                    <td>{project.targetDate ?? "—"}</td>
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
