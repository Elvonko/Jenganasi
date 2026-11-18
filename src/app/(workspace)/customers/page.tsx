import { ArrowRight, Plus, Users } from "lucide-react";
import Link from "next/link";
import { getCompanyContext } from "@/lib/company-context";
import { hasPermission } from "@/lib/permissions";
import { listCustomers } from "@/lib/customer-service";

export default async function CustomersPage() {
  const context = await getCompanyContext("customers:read");
  const customers = await listCustomers(context.actor, true);
  const canCreate = hasPermission(context.actor.role, "customers:create");

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">CUSTOMER REGISTER</p>
          <h1>Customers</h1>
          <p className="muted">
            Keep customer contacts together and link them to their projects.
          </p>
        </div>
        {canCreate && (
          <Link className="button button-primary" href="/customers/new">
            <Plus size={17} aria-hidden="true" />
            New customer
          </Link>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ALL CUSTOMERS</p>
            <h2>{customers.length} {customers.length === 1 ? "record" : "records"}</h2>
          </div>
          <span className="table-caption">
            Inactive records are preserved and remain linked to existing projects.
          </span>
        </div>
        {customers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <Users size={22} aria-hidden="true" />
            </span>
            <h3>No customers yet.</h3>
            <p>Add a customer record to link people and organizations to projects.</p>
            {canCreate && (
              <Link className="button button-secondary" href="/customers/new">
                Add a customer <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Projects</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Open customer</span></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link
                        className="project-name-link"
                        href={`/customers/${customer.id}`}
                      >
                        <strong>{customer.name}</strong>
                      </Link>
                    </td>
                    <td>{customer.email ?? "—"}</td>
                    <td>{customer.phone ?? "—"}</td>
                    <td>{customer.projectCount}</td>
                    <td>
                      <span className={`status-pill status-${customer.status}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="row-action"
                        href={`/customers/${customer.id}`}
                        aria-label={`Open ${customer.name}`}
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
