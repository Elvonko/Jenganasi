import Link from "next/link";
import { createCustomer } from "@/app/customers/actions";
import { CustomerForm } from "@/app/customers/customer-form";
import { getCompanyContext } from "@/lib/company-context";

export default async function NewCustomerPage() {
  await getCompanyContext("customers:create");

  return (
    <div className="page-stack narrow-page">
      <div className="breadcrumbs">
        <Link href="/customers">Customers</Link>
        <span>/</span>
        <span>New customer</span>
      </div>
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">CUSTOMER SETUP</p>
            <h1>Add a customer</h1>
            <p className="muted">
              Save a contact record for an individual or organization.
            </p>
          </div>
        </div>
        <CustomerForm action={createCustomer} submitLabel="Create customer" />
      </section>
    </div>
  );
}
