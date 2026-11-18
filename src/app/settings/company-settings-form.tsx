"use client";

import { useActionState } from "react";
import type { CompanySettingsFormState } from "@/app/settings/actions";

type CompanySettingsFormProps = {
  action: (
    previousState: CompanySettingsFormState,
    formData: FormData,
  ) => Promise<CompanySettingsFormState>;
  initial: {
    name: string;
    countryCode: string;
    currencyCode: string;
    timezone: string;
  };
};

export function CompanySettingsForm({
  action,
  initial,
}: CompanySettingsFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

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
          defaultValue={initial.name}
        />
      </label>
      <div className="form-grid-two">
        <label className="field">
          <span>Country</span>
          <select name="countryCode" defaultValue={initial.countryCode}>
            <option value="KE">Kenya</option>
            <option value="UG">Uganda</option>
            <option value="TZ">Tanzania</option>
            <option value="RW">Rwanda</option>
            <option value="US">United States</option>
          </select>
        </label>
        <label className="field">
          <span>Reporting currency</span>
          <select name="currencyCode" defaultValue={initial.currencyCode}>
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
      <label className="field">
        <span>Time zone</span>
        <select name="timezone" defaultValue={initial.timezone}>
          <option value="Africa/Nairobi">East Africa — Nairobi</option>
          <option value="Africa/Kampala">East Africa — Kampala</option>
          <option value="Africa/Dar_es_Salaam">East Africa — Dar es Salaam</option>
          <option value="Africa/Kigali">East Africa — Kigali</option>
          <option value="America/New_York">United States — New York</option>
          <option value="UTC">Coordinated Universal Time (UTC)</option>
        </select>
      </label>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      <div className="form-actions">
        <button className="button button-primary" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
