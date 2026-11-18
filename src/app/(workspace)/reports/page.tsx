import {
  BarChart3,
  CircleCheck,
  ClipboardList,
  FolderKanban,
  ListTodo,
} from "lucide-react";
import Link from "next/link";
import { getCompanyContext } from "@/lib/company-context";
import { getCompanyReport } from "@/lib/report-service";

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function readableLabel(value: string) {
  return value.replaceAll(".", " ").replaceAll("_", " ");
}

export default async function ReportsPage() {
  const context = await getCompanyContext("reports:read");
  const report = await getCompanyReport(context.actor);
  const activeCount =
    (report.projectStatusCounts.in_progress ?? 0) +
    (report.projectStatusCounts.planned ?? 0) +
    (report.projectStatusCounts.on_hold ?? 0);

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">COMPANY PERFORMANCE</p>
          <h1>Reports</h1>
          <p className="muted">
            Project progress and estimate activity across {context.company.name}.
          </p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Company performance summary">
        <article className="metric-card">
          <span className="metric-icon metric-icon-yellow">
            <FolderKanban size={18} aria-hidden="true" />
          </span>
          <span className="metric-label">Active projects</span>
          <strong className="metric-value">{activeCount}</strong>
          <span className="metric-note">Excludes archived projects</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-green">
            <CircleCheck size={18} aria-hidden="true" />
          </span>
          <span className="metric-label">Average progress</span>
          <strong className="metric-value">{report.averageProgress}%</strong>
          <span className="metric-note">Across current projects</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-blue">
            <ListTodo size={18} aria-hidden="true" />
          </span>
          <span className="metric-label">Tasks completed</span>
          <strong className="metric-value">
            {report.completedTaskCount}/{report.taskCount}
          </strong>
          <span className="metric-note">On active projects</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-slate">
            <ClipboardList size={18} aria-hidden="true" />
          </span>
          <span className="metric-label">Estimated value</span>
          <strong className="metric-value metric-value-currency">
            {formatCurrency(report.estimatedTotal, context.company.currencyCode)}
          </strong>
          <span className="metric-note">Excludes tax; all estimate statuses</span>
        </article>
      </section>

      <div className="report-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PROJECT DELIVERY</p>
              <h2>{report.projects.length} current projects</h2>
            </div>
            <Link className="text-link" href="/projects">
              Project register
            </Link>
          </div>
          {report.projects.length === 0 ? (
            <div className="empty-state report-empty-state">
              <span className="empty-icon">
                <FolderKanban size={22} aria-hidden="true" />
              </span>
              <h3>No project data yet.</h3>
              <p>Create a project to begin tracking company delivery.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Project</th>
                    <th scope="col">Status</th>
                    <th scope="col">Progress</th>
                    <th scope="col">Tasks</th>
                    <th scope="col">Milestones</th>
                  </tr>
                </thead>
                <tbody>
                  {report.projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <Link
                          className="project-name-link"
                          href={`/projects/${project.id}`}
                        >
                          <span className="project-code">
                            {project.projectCode}
                          </span>
                          <strong>{project.name}</strong>
                        </Link>
                      </td>
                      <td>
                        <span className={`status-pill status-${project.status}`}>
                          {readableLabel(project.status)}
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
                            <span
                              style={{ width: `${project.progressPercent}%` }}
                            />
                          </div>
                          <span>{project.progressPercent}%</span>
                        </div>
                      </td>
                      <td>
                        {project.completedTaskCount}/{project.taskCount}
                      </td>
                      <td>{project.milestoneCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ESTIMATES</p>
              <h2>{report.estimateCount} estimates</h2>
            </div>
            <Link className="text-link" href="/estimates">
              Estimate register
            </Link>
          </div>
          <div className="report-status-list">
            {report.estimateCount === 0 ? (
              <p className="work-empty">No estimate data available yet.</p>
            ) : (
              Object.entries(report.estimateTotalsByStatus)
                .sort(([statusA], [statusB]) => statusA.localeCompare(statusB))
                .map(([status, total]) => (
                  <div className="report-status-row" key={status}>
                    <span className={`estimate-status estimate-status-${status}`}>
                      {readableLabel(status)}
                    </span>
                    <strong>{formatCurrency(total, context.company.currencyCode)}</strong>
                  </div>
                ))
            )}
          </div>
          <p className="report-footnote">
            Values use {context.company.currencyCode}, reflect current BOQ items,
            and exclude taxes.
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">RECENT ACTIVITY</p>
            <h2>Latest company updates</h2>
          </div>
          <BarChart3 size={18} aria-hidden="true" />
        </div>
        {report.recentActivity.length === 0 ? (
          <p className="work-empty report-activity-empty">
            Company activity will appear here as your team works.
          </p>
        ) : (
          <ul className="report-activity-list">
            {report.recentActivity.map((activity) => (
              <li className="report-activity-item" key={activity.id}>
                <span className="report-activity-marker" aria-hidden="true" />
                <div>
                  <strong>{readableLabel(activity.action)}</strong>
                  <p>
                    {activity.actorName} · {readableLabel(activity.resourceType)}
                  </p>
                </div>
                <time dateTime={activity.occurredAt.toISOString()}>
                  {new Intl.DateTimeFormat("en-KE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: context.company.timezone,
                  }).format(activity.occurredAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="report-disclaimer">
        Figures reflect current records at report time. Archived projects are
        excluded; estimate values are current, untaxed BOQ totals, not invoiced
        or paid amounts.
      </p>
    </div>
  );
}
