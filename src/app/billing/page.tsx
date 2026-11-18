import Link from "next/link";
import { updateAutoRenew } from "@/app/billing/actions";
import { MpesaCheckoutForm } from "@/components/mpesa-checkout-form";
import { getCompanyContext } from "@/lib/company-context";
import { getPricingPlan, pricingPlans } from "@/lib/pricing";
import {
  getCompanySubscription,
  listCompanyPayments,
} from "@/lib/subscription-service";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { actor, company } = await getCompanyContext("settings:update");
  const [subscription, payments] = await Promise.all([
    getCompanySubscription(actor),
    listCompanyPayments(actor),
  ]);
  const currentPlan = getPricingPlan(company.planCode);

  return (
    <div className="page-stack narrow-page">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">BILLING</p>
            <h1>Plan and payments</h1>
            <p className="muted">
              Pay yearly with M-Pesa. Your plan unlocks immediately after payment is confirmed.
            </p>
          </div>
        </div>
        <div className="detail-meta">
          <span>Current plan: <strong>{currentPlan.name}</strong></span>
          <span>Status: <strong>{subscription?.status ?? "free"}</strong></span>
          {subscription?.currentPeriodEnd && (
            <span>
              Renews by{" "}
              <strong>
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </strong>
            </span>
          )}
        </div>
        {subscription?.status === "active" && (
          <form action={updateAutoRenew} className="form-stack">
            <input type="hidden" name="enabled" value={subscription.autoRenew ? "false" : "true"} />
            <label className="remember-me">
              <input type="checkbox" checked={subscription.autoRenew} readOnly />
              <span>
                <span className="remember-me-label">Auto-renew with M-Pesa</span>
                <small className="field-hint">
                  Consent recorded{" "}
                  {subscription.autoRenewConsentAt
                    ? new Date(subscription.autoRenewConsentAt).toLocaleString()
                    : "not yet"}
                </small>
              </span>
            </label>
            <button className="button button-secondary" type="submit">
              {subscription.autoRenew ? "Turn off auto-renew" : "Turn on auto-renew"}
            </button>
          </form>
        )}
      </section>

      {pricingPlans.filter((plan) => plan.id !== "free").map((plan) => (
        <section className="panel form-panel" key={plan.id}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{plan.name.toUpperCase()}</p>
              <h2>KES {plan.priceKesPerYear} / year</h2>
              <p className="muted">{plan.description}</p>
            </div>
          </div>
          <MpesaCheckoutForm
            planId={plan.id}
            planName={plan.name}
            amountKes={plan.priceKesPerYear}
          />
        </section>
      ))}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">HISTORY</p>
            <h2>M-Pesa payments</h2>
          </div>
        </div>
        {payments.length === 0 ? (
          <p className="work-empty">No payments yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{new Date(payment.initiatedAt).toLocaleString()}</td>
                  <td>{getPricingPlan(payment.planCode).name}</td>
                  <td>KES {payment.amountKes}</td>
                  <td>{payment.status}</td>
                  <td>{payment.mpesaReceiptNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="muted">
        Need help with a payment? <Link href="/settings">Review company settings</Link>.
      </p>
    </div>
  );
}
