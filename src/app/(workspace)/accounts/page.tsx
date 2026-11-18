import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { memberships, users } from "@/db/schema";
import { getCompanyContext } from "@/lib/company-context";

export default async function AccountsPage() {
  const context = await getCompanyContext("accounts:read");
  const accounts = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.companyId, context.actor.companyId))
    .orderBy(desc(users.createdAt));

  const registeredDate = new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: context.company.timezone,
  });

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">COMPANY ADMINISTRATION</p>
          <h1>Registered accounts</h1>
          <p className="muted">
            Accounts with access to {context.company.name}.
          </p>
        </div>
        <span className="table-caption">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
        </span>
      </section>

      <section className="panel project-panel">
        {accounts.length === 0 ? (
          <div className="empty-state">
            <h3>No accounts found.</h3>
            <p>Accounts with access to this company will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Email status</th>
                  <th scope="col">Registered</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td><strong>{account.name}</strong></td>
                    <td>{account.email}</td>
                    <td>{account.role.replaceAll("_", " ")}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          account.emailVerified
                            ? "status-completed"
                            : "status-planned"
                        }`}
                      >
                        {account.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td>{registeredDate.format(account.createdAt)}</td>
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
