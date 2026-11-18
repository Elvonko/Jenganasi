import {
  Send,
  Check,
  CircleDollarSign,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addEstimateLineItemAction,
  removeEstimateLineItemAction,
  updateEstimateStatusAction,
} from "@/app/estimates/actions";
import { EstimateLineItemForm } from "@/app/estimates/estimate-line-item-form";
import { getCompanyContext } from "@/lib/company-context";
import { calculateEstimateTotal, getEstimate } from "@/lib/estimate-service";
import { hasPermission } from "@/lib/permissions";

type EstimatePageProps = {
  params: Promise<{ id: string }>;
};

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

function canTransition(status: string, nextStatus: string) {
  if (status === "draft") return nextStatus === "sent";
  if (status === "sent") return nextStatus === "approved" || nextStatus === "revision_requested";
  return status === "revision_requested" && nextStatus === "draft";
}

export default async function EstimateDetailPage({ params }: EstimatePageProps) {
  const { id } = await params;
  const context = await getCompanyContext("estimates:read");
  const estimate = await getEstimate(context.actor, id);

  if (!estimate) {
    notFound();
  }

  const canUpdate = hasPermission(context.actor.role, "estimates:update");
  const isDraft = estimate.status === "draft";
  const subtotal = calculateEstimateTotal(estimate.items);
  const canSend = canUpdate && estimate.items.length > 0 && canTransition(estimate.status, "sent");

  return (
    <div className="page-stack">
      <div className="breadcrumbs">
        <Link href="/estimates">Estimates &amp; BOQ</Link>
        <span>/</span>
        <span>{estimate.reference}</span>
      </div>

      <section className="estimate-detail-hero">
        <div className="estimate-detail-heading">
          <span className={`estimate-status estimate-status-${estimate.status}`}>
            {statusLabel(estimate.status)}
          </span>
          <p className="project-code">{estimate.reference}</p>
          <h1>{estimate.name}</h1>
          <p className="muted">Project: {estimate.projectName}</p>
        </div>
        <div className="estimate-detail-actions">
          {canSend && (
            <form action={updateEstimateStatusAction}>
              <input type="hidden" name="estimateId" value={estimate.id} />
              <input type="hidden" name="status" value="sent" />
              <button className="button button-primary">
                Mark as sent <Send size={15} aria-hidden="true" />
              </button>
            </form>
          )}
          {canUpdate && estimate.status === "sent" && (
            <>
              <form action={updateEstimateStatusAction}>
                <input type="hidden" name="estimateId" value={estimate.id} />
                <input type="hidden" name="status" value="revision_requested" />
                <button className="button button-secondary">Request revision</button>
              </form>
              <form action={updateEstimateStatusAction}>
                <input type="hidden" name="estimateId" value={estimate.id} />
                <input type="hidden" name="status" value="approved" />
                <button className="button button-primary">
                  <Check size={15} aria-hidden="true" /> Approve estimate
                </button>
              </form>
            </>
          )}
          {canUpdate && estimate.status === "revision_requested" && (
            <form action={updateEstimateStatusAction}>
              <input type="hidden" name="estimateId" value={estimate.id} />
              <input type="hidden" name="status" value="draft" />
              <button className="button button-secondary">Return to draft</button>
            </form>
          )}
          <Link className="button button-secondary" href="/estimates">
            Back to estimates
          </Link>
        </div>
      </section>

      <section className="estimate-total-strip" aria-label="Estimate total">
        <div>
          <span className="estimate-total-icon">
            <CircleDollarSign size={19} aria-hidden="true" />
          </span>
          <div>
            <span className="estimate-total-label">BOQ TOTAL</span>
            <p>{estimate.items.length} {estimate.items.length === 1 ? "line item" : "line items"} · Tax not included</p>
          </div>
        </div>
        <strong>{formatCurrency(subtotal, context.company.currencyCode)}</strong>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">BILL OF QUANTITIES</p>
            <h2>Cost breakdown</h2>
          </div>
          <span className="table-caption">{context.company.currencyCode} per unit</span>
        </div>
        {estimate.items.length === 0 ? (
          <div className="empty-state estimate-empty-state">
            <span className="empty-icon"><FileSpreadsheet size={22} aria-hidden="true" /></span>
            <h3>Your BOQ starts with a line item.</h3>
            <p>Add work, material or service quantities and their unit rates.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table estimate-boq-table">
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col">Cost type</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Unit rate</th>
                  <th scope="col">Amount</th>
                  {canUpdate && isDraft && <th scope="col"><span className="sr-only">Remove item</span></th>}
                </tr>
              </thead>
              <tbody>
                {estimate.items.map((item) => {
                  const amount = Math.round(item.quantity * item.unitRate * 100) / 100;
                  return (
                    <tr key={item.id}>
                      <td><strong className="estimate-line-description">{item.description}</strong></td>
                      <td><span className="estimate-category">{item.category}</span></td>
                      <td>{item.unit}</td>
                      <td>{new Intl.NumberFormat("en-KE", { maximumFractionDigits: 3 }).format(item.quantity)}</td>
                      <td>{formatCurrency(item.unitRate, context.company.currencyCode)}</td>
                      <td className="estimate-amount">{formatCurrency(amount, context.company.currencyCode)}</td>
                      {canUpdate && isDraft && (
                        <td>
                          <form action={removeEstimateLineItemAction}>
                            <input type="hidden" name="estimateId" value={estimate.id} />
                            <input type="hidden" name="itemId" value={item.id} />
                            <button
                              className="row-action estimate-remove-item"
                              aria-label={`Remove ${item.description}`}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={5} scope="row">Subtotal</th>
                  <td className="estimate-amount">{formatCurrency(subtotal, context.company.currencyCode)}</td>
                  {canUpdate && isDraft && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {canUpdate && isDraft ? (
        <section className="panel form-panel estimate-add-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ADD TO THE BOQ</p>
              <h2>Add a cost line</h2>
            </div>
          </div>
          <EstimateLineItemForm
            estimateId={estimate.id}
            currencyCode={context.company.currencyCode}
            action={addEstimateLineItemAction}
          />
        </section>
      ) : (
        <p className="estimate-readonly-note">
          This {estimate.status === "approved" ? "approved" : "sent"} estimate is read-only.
        </p>
      )}
      {canUpdate && isDraft && estimate.items.length === 0 && (
        <p className="estimate-send-hint">
          Add at least one BOQ line before marking this estimate as sent.
        </p>
      )}
    </div>
  );
}
