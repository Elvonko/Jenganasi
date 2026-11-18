import { ArrowRight, FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";
import { getCompanyContext } from "@/lib/company-context";
import { hasPermission } from "@/lib/permissions";
import { listEstimates } from "@/lib/estimate-service";

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function EstimatesPage() {
  const context = await getCompanyContext("estimates:read");
  const estimates = await listEstimates(context.actor);
  const canCreate = hasPermission(context.actor.role, "estimates:create");
  const totalValue = estimates.reduce((total, estimate) => total + estimate.total, 0);

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">COST PLANNING</p>
          <h1>Estimates &amp; BOQ</h1>
          <p className="muted">
            Build a clear bill of quantities and keep project costs in view.
          </p>
        </div>
        {canCreate && (
          <Link className="button button-primary" href="/estimates/new">
            <Plus size={17} aria-hidden="true" />
            New estimate
          </Link>
        )}
      </section>

      <section className="estimate-summary-grid" aria-label="Estimate summary">
        <article className="estimate-summary-card">
          <span className="estimate-summary-label">ESTIMATES</span>
          <strong>{estimates.length}</strong>
          <span className="estimate-summary-note">Across active projects</span>
        </article>
        <article className="estimate-summary-card estimate-summary-highlight">
          <span className="estimate-summary-label">TOTAL ESTIMATED VALUE</span>
          <strong>{formatCurrency(totalValue, context.company.currencyCode)}</strong>
          <span className="estimate-summary-note">Based on current BOQ items</span>
        </article>
        <article className="estimate-summary-card">
          <span className="estimate-summary-label">DRAFTS</span>
          <strong>{estimates.filter((estimate) => estimate.status === "draft").length}</strong>
          <span className="estimate-summary-note">Ready to keep working on</span>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ESTIMATE REGISTER</p>
            <h2>{estimates.length} {estimates.length === 1 ? "estimate" : "estimates"}</h2>
          </div>
          <span className="table-caption">
            Values use {context.company.currencyCode}; taxes are not included.
          </span>
        </div>

        {estimates.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <FileSpreadsheet size={22} aria-hidden="true" />
            </span>
            <h3>No estimates yet.</h3>
            <p>
              Create an estimate for a project, then add quantities and unit
              rates to build its bill of quantities.
            </p>
            {canCreate && (
              <Link className="button button-secondary" href="/estimates/new">
                Create an estimate <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table estimate-register-table">
              <thead>
                <tr>
                  <th scope="col">Estimate</th>
                  <th scope="col">Project</th>
                  <th scope="col">Status</th>
                  <th scope="col">BOQ items</th>
                  <th scope="col">Estimated value</th>
                  <th scope="col"><span className="sr-only">Open estimate</span></th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((estimate) => (
                  <tr key={estimate.id}>
                    <td>
                      <Link className="project-name-link" href={`/estimates/${estimate.id}`}>
                        <span className="project-code">{estimate.reference}</span>
                        <strong>{estimate.name}</strong>
                      </Link>
                    </td>
                    <td>{estimate.projectName}</td>
                    <td>
                      <span className={`estimate-status estimate-status-${estimate.status}`}>
                        {statusLabel(estimate.status)}
                      </span>
                    </td>
                    <td>{estimate.itemCount}</td>
                    <td className="estimate-amount">
                      {formatCurrency(estimate.total, context.company.currencyCode)}
                    </td>
                    <td>
                      <Link
                        className="row-action"
                        href={`/estimates/${estimate.id}`}
                        aria-label={`Open ${estimate.name}`}
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
