"use client";

import { useActionState } from "react";
import { createCompany } from "@/lib/company-actions";

export function CompanySetupForm() {
  const [state, formAction, pending] = useActionState(createCompany, {});

  return (
    <form action={formAction} className="form-stack">
      <label className="field">
        <span>Company name</span>
        <input
          autoComplete="organization"
          name="name"
          required
          minLength={2}
          maxLength={120}
          placeholder="Your construction company"
        />
      </label>
      <div className="form-grid-two">
        <label className="field">
          <span>Country</span>
          <select name="countryCode" defaultValue="KE">
            <option value="KE">Kenya</option>
            <option value="UG">Uganda</option>
            <option value="TZ">Tanzania</option>
            <option value="RW">Rwanda</option>
            <option value="US">United States</option>
          </select>
        </label>
        <label className="field">
          <span>Reporting currency</span>
          <select name="currencyCode" defaultValue="KES">
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="UGX">UGX — Ugandan Shilling</option>
            <option value="TZS">TZS — Tanzanian Shilling</option>
            <option value="RWF">RWF — Rwandan Franc</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — Pound Sterling</option>
          </select>
        </label>
      </div>
      {state.error && (
        <p className="form-error" role="alert">{state.error}</p>
      )}
      <button className="button button-primary button-full" disabled={pending}>
        {pending ? "Creating workspace…" : "Create company workspace"}
      </button>
    </form>
  );
}
