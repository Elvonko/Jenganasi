"use client";

import { useActionState } from "react";
import type { CustomerFormState } from "@/app/customers/actions";

type CustomerFormProps = {
  action: (
    previousState: CustomerFormState,
    formData: FormData,
  ) => Promise<CustomerFormState>;
  initial?: {
    id?: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  submitLabel: string;
};

export function CustomerForm({
  action,
  initial,
  submitLabel,
}: CustomerFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="form-stack">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <label className="field">
        <span>Customer or company name</span>
        <input
          autoComplete="organization"
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={initial?.name}
          placeholder="e.g. Ridgeview Properties"
        />
      </label>
      <div className="form-grid-two">
        <label className="field">
          <span>Email <span className="muted">(optional)</span></span>
          <input
            autoComplete="email"
            name="email"
            type="email"
            maxLength={254}
            defaultValue={initial?.email ?? ""}
            placeholder="contact@example.com"
          />
        </label>
        <label className="field">
          <span>Phone <span className="muted">(optional)</span></span>
          <input
            autoComplete="tel"
            name="phone"
            type="tel"
            maxLength={32}
            defaultValue={initial?.phone ?? ""}
            placeholder="+254 700 000 000"
          />
        </label>
      </div>
      <label className="field">
        <span>Address <span className="muted">(optional)</span></span>
        <textarea
          autoComplete="street-address"
          name="address"
          maxLength={240}
          rows={3}
          defaultValue={initial?.address ?? ""}
          placeholder="Postal or business address"
        />
      </label>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-actions">
        <button className="button button-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
