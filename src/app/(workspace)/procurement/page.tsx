import {
  BadgeCheck,
  Boxes,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  Plus,
} from "lucide-react";
import { getCompanyContext } from "@/lib/company-context";
import { hasPermission } from "@/lib/permissions";
import { listProjects } from "@/lib/project-service";
import {
  listPurchaseOrders,
  listSuppliers,
  type PurchaseOrderRecord,
} from "@/lib/procurement-service";
import { createPurchaseOrder, createSupplier, updatePurchaseOrderStatus } from "@/app/procurement/actions";
import {
  PurchaseOrderForm,
  SupplierForm,
} from "@/app/procurement/procurement-forms";

function formatCurrency(amountCents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function nextAction(
  order: PurchaseOrderRecord,
  permissions: {
    canApprove: boolean;
    canUpdate: boolean;
    canReceive: boolean;
  },
) {
  if (order.status === "pending_approval" && permissions.canApprove) {
    return { status: "approved" as const, label: "Approve" };
  }
  if (order.status === "approved" && permissions.canUpdate) {
    return { status: "ordered" as const, label: "Mark ordered" };
  }
  if (order.status === "ordered" && permissions.canReceive) {
    return { status: "received" as const, label: "Mark received" };
  }
  return null;
}

export default async function ProcurementPage() {
  const context = await getCompanyContext("procurement:read");
  const [orders, suppliers, projects] = await Promise.all([
    listPurchaseOrders(context.actor),
    listSuppliers(context.actor),
    listProjects(context.actor),
  ]);
  const canCreate = hasPermission(context.actor.role, "procurement:create");
  const permissions = {
    canApprove: hasPermission(context.actor.role, "procurement:approve"),
    canUpdate: hasPermission(context.actor.role, "procurement:update"),
    canReceive: hasPermission(context.actor.role, "procurement:receive"),
  };
  const pendingCount = orders.filter(
    (order) => order.status === "pending_approval",
  ).length;
  const openCount = orders.filter(
    (order) => ["approved", "ordered"].includes(order.status),
  ).length;
  const committedAmount = orders
    .filter((order) => ["approved", "ordered", "received"].includes(order.status))
    .reduce((total, order) => total + order.amountCents, 0);

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">SUPPLIERS &amp; PURCHASING</p>
          <h1>Procurement</h1>
          <p className="muted">
            Track supplier requests, approvals and deliveries across your projects.
          </p>
        </div>
        {canCreate && (
          <a className="button button-primary" href="#new-purchase-request">
            <Plus size={17} aria-hidden="true" />
            New purchase request
          </a>
        )}
      </section>

      <section className="metric-grid" aria-label="Procurement summary">
        <article className="metric-card">
          <span className="metric-icon metric-icon-yellow"><Clock3 size={17} aria-hidden="true" /></span>
          <span className="metric-label">AWAITING APPROVAL</span>
          <strong className="metric-value">{pendingCount}</strong>
          <span className="metric-note">Purchase requests</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-blue"><Boxes size={17} aria-hidden="true" /></span>
          <span className="metric-label">OPEN ORDERS</span>
          <strong className="metric-value">{openCount}</strong>
          <span className="metric-note">Approved or in delivery</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-green"><CircleDollarSign size={17} aria-hidden="true" /></span>
          <span className="metric-label">COMMITTED SPEND</span>
          <strong className="metric-value metric-value-currency">
            {formatCurrency(committedAmount, context.company.currencyCode)}
          </strong>
          <span className="metric-note">Approved, ordered and received</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-slate"><PackageCheck size={17} aria-hidden="true" /></span>
          <span className="metric-label">ACTIVE SUPPLIERS</span>
          <strong className="metric-value">{suppliers.length}</strong>
          <span className="metric-note">Ready to receive orders</span>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PURCHASE ORDERS</p>
            <h2>{orders.length} {orders.length === 1 ? "request" : "requests"}</h2>
          </div>
          <span className="table-caption">
            All values in {context.company.currencyCode}.
          </span>
        </div>
        {orders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Boxes size={22} aria-hidden="true" /></span>
            <h3>No purchase requests yet.</h3>
            <p>
              Add a supplier, then submit a request to track its approval and delivery.
            </p>
            {canCreate && (
              <a className="button button-secondary" href="#new-purchase-request">
                Create a purchase request <Plus size={16} aria-hidden="true" />
              </a>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table procurement-table">
              <thead>
                <tr>
                  <th scope="col">Request</th>
                  <th scope="col">Supplier</th>
                  <th scope="col">Project</th>
                  <th scope="col">Status</th>
                  <th scope="col">Expected</th>
                  <th scope="col">Value</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const action = nextAction(order, permissions);
                  return (
                    <tr key={order.id}>
                      <td>
                        <span className="project-name-link">
                          <span className="project-code">{order.reference}</span>
                          <strong>{order.description}</strong>
                        </span>
                      </td>
                      <td>{order.supplierName}</td>
                      <td>{order.projectName ?? "Company-wide"}</td>
                      <td>
                        <span className={`status-pill procurement-status-${order.status}`}>
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td>{order.expectedDelivery ?? "—"}</td>
                      <td className="estimate-amount">
                        {formatCurrency(order.amountCents, context.company.currencyCode)}
                      </td>
                      <td>
                        <div className="procurement-row-actions">
                          {action && (
                            <form action={updatePurchaseOrderStatus}>
                              <input type="hidden" name="id" value={order.id} />
                              <input type="hidden" name="status" value={action.status} />
                              <button className="button button-secondary button-compact">
                                {action.status === "approved" && <BadgeCheck size={14} aria-hidden="true" />}
                                {action.label}
                              </button>
                            </form>
                          )}
                          {permissions.canUpdate &&
                            ["pending_approval", "approved"].includes(order.status) && (
                              <form action={updatePurchaseOrderStatus}>
                                <input type="hidden" name="id" value={order.id} />
                                <input type="hidden" name="status" value="cancelled" />
                                <button className="procurement-cancel-button">Cancel</button>
                              </form>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canCreate && (
        <section className="procurement-setup-grid" id="new-purchase-request">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">NEW REQUEST</p>
                <h2>Submit for approval</h2>
              </div>
            </div>
            {suppliers.length === 0 ? (
              <div className="empty-state procurement-inline-empty">
                <h3>Add a supplier first.</h3>
                <p>Your request needs an active supplier to continue.</p>
              </div>
            ) : (
              <div className="procurement-form-body">
                <PurchaseOrderForm
                  action={createPurchaseOrder}
                  suppliers={suppliers}
                  projects={projects}
                  currencyCode={context.company.currencyCode}
                />
              </div>
            )}
          </article>

          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SUPPLIER DIRECTORY</p>
                <h2>{suppliers.length} active {suppliers.length === 1 ? "supplier" : "suppliers"}</h2>
              </div>
            </div>
            <div className="procurement-form-body">
              {suppliers.length > 0 && (
                <ul className="supplier-list">
                  {suppliers.slice(0, 4).map((supplier) => (
                    <li key={supplier.id}>
                      <span className="supplier-avatar">{supplier.name.slice(0, 1).toUpperCase()}</span>
                      <span className="supplier-list-copy">
                        <strong>{supplier.name}</strong>
                        <span>{supplier.category || supplier.email || supplier.phone || "Active supplier"}</span>
                      </span>
                    </li>
                  ))}
                  {suppliers.length > 4 && (
                    <li className="supplier-list-more">And {suppliers.length - 4} more suppliers</li>
                  )}
                </ul>
              )}
              <SupplierForm action={createSupplier} />
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
