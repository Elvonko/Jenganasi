import { ArrowLeft, ArrowRight, Check, CreditCard, Smartphone } from "lucide-react";
import Link from "next/link";
import { pricingPlans } from "@/lib/pricing";

export default function PricingPage() {
  return (
    <main className="home-page pricing-page">
      <header className="home-header">
        <div className="home-header-inner">
          <Link className="home-brand" href="/" aria-label="JengaNasi home">
            <span className="home-brand-mark" aria-hidden="true">J</span>
            <span className="home-brand-name">Jenga<span>Nasi</span></span>
          </Link>
          <nav className="home-nav" aria-label="Main navigation">
            <Link href="/#platform">Platform</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/">Home</Link>
          </nav>
          <div className="home-header-actions">
            <Link className="home-sign-in" href="/sign-in">Sign in</Link>
            <Link className="home-header-cta" href="/sign-up">
              Get started <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="pricing-content">
        <Link className="pricing-back-link" href="/">
          <ArrowLeft size={15} aria-hidden="true" /> Back to JengaNasi
        </Link>
        <div className="pricing-heading">
          <p className="home-eyebrow">
            <span className="home-eyebrow-line" />
            CLEAR PLANS FOR YOUR NEXT BUILD
          </p>
          <h1>Choose the room<br />your projects need.</h1>
          <p>Simple annual pricing that grows with your work.</p>
        </div>

        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <article
              className={`pricing-card${plan.id === "pro" ? " pricing-card-featured" : ""}`}
              key={plan.id}
            >
              {plan.id === "pro" && (
                <span className="pricing-popular-label">MOST POPULAR</span>
              )}
              <p className="pricing-plan-name">{plan.name}</p>
              <p className="pricing-description">{plan.description}</p>
              <p className="pricing-price">
                <strong>
                  {plan.priceUsdPerYear === 0 ? "Free" : `$${plan.priceUsdPerYear}`}
                </strong>
                {plan.priceUsdPerYear > 0 && <span> / year</span>}
              </p>
              <p className="pricing-renewal">
                {plan.priceUsdPerYear === 0 ? "No charge" : "Billed yearly · USD"}
              </p>
              <ul className="pricing-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.id === "free" ? (
                <Link className="pricing-action pricing-action-primary" href="/sign-up">
                  Start for free <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <button className="pricing-action pricing-action-disabled" disabled>
                  Checkout coming soon
                </button>
              )}
            </article>
          ))}
        </div>

        <aside className="pricing-payment-note">
          <div className="pricing-payment-heading">
            <span className="pricing-payment-icon"><CreditCard size={17} aria-hidden="true" /></span>
            <span className="pricing-payment-icon"><Smartphone size={17} aria-hidden="true" /></span>
            <strong>Payment options planned</strong>
          </div>
          <p>
            Visa card and M-Pesa (Safaricom). Paid checkout is not active yet;
            you won’t be charged from this page.
          </p>
        </aside>
      </section>

      <footer className="home-footer">
        <div className="home-footer-inner">
          <Link className="home-brand" href="/" aria-label="JengaNasi home">
            <span className="home-brand-mark" aria-hidden="true">J</span>
            <span className="home-brand-name">Jenga<span>Nasi</span></span>
          </Link>
          <p>Construction, in good company.</p>
          <span className="home-footer-copyright">© {new Date().getFullYear()} JengaNasi</span>
        </div>
      </footer>
    </main>
  );
}
