import { Archive } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  setCustomerStatus,
  updateCustomer,
} from "@/app/customers/actions";
import { CustomerForm } from "@/app/customers/customer-form";
import { getCompanyContext } from "@/lib/company-context";
import { hasPermission } from "@/lib/permissions";
import { getCustomer } from "@/lib/customer-service";

type CustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({
  params,
}: CustomerPageProps) {
  const { id } = await params;
  const context = await getCompanyContext("customers:read");
  const customer = await getCustomer(context.actor, id);

  if (!customer) {
    notFound();
  }

  const canUpdate = hasPermission(context.actor.role, "customers:update");
  const canArchive = hasPermission(context.actor.role, "customers:archive");

  return (
    <div className="page-stack narrow-page">
      <div className="breadcrumbs">
        <Link href="/customers">Customers</Link>
        <span>/</span>
        <span>{customer.name}</span>
      </div>
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">CUSTOMER DETAILS</p>
            <h1>{customer.name}</h1>
            <span className={`status-pill status-${customer.status}`}>
              {customer.status}
            </span>
          </div>
        </div>
        {canUpdate ? (
          <CustomerForm
            action={updateCustomer}
            initial={customer}
            submitLabel="Save changes"
          />
        ) : (
          <dl className="detail-list">
            <div><dt>Email</dt><dd>{customer.email ?? "Not set"}</dd></div>
            <div><dt>Phone</dt><dd>{customer.phone ?? "Not set"}</dd></div>
            <div><dt>Address</dt><dd>{customer.address ?? "Not set"}</dd></div>
          </dl>
        )}
      </section>

      {canArchive && (
        <section className="archive-panel">
          <div>
            <span className="archive-icon">
              <Archive size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>
                {customer.status === "active" ? "Archive this customer" : "Restore this customer"}
              </strong>
              <p>
                {customer.status === "active"
                  ? "Archived customers cannot be newly assigned to projects. Existing project links are preserved."
                  : "Restoring this customer allows it to be assigned to projects again."}
              </p>
            </div>
          </div>
          <form action={setCustomerStatus}>
            <input type="hidden" name="id" value={customer.id} />
            <input
              type="hidden"
              name="status"
              value={customer.status === "active" ? "inactive" : "active"}
            />
            <button
              className={customer.status === "active" ? "button button-danger" : "button button-secondary"}
              type="submit"
            >
              {customer.status === "active" ? "Archive customer" : "Restore customer"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
