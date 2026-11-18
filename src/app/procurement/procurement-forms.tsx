"use client";

import { useActionState } from "react";
import type { Project } from "@/db/schema";
import type { Supplier } from "@/db/schema";
import type { ProcurementFormState } from "@/app/procurement/actions";

type FormAction = (
  previousState: ProcurementFormState,
  formData: FormData,
) => Promise<ProcurementFormState>;

export function SupplierForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="form-stack">
      <label className="field">
        <span>Supplier name</span>
        <input
          autoComplete="organization"
          name="name"
          required
          minLength={2}
          maxLength={120}
          placeholder="e.g. BuildRight Supplies"
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
            placeholder="orders@example.com"
          />
        </label>
        <label className="field">
          <span>Phone <span className="muted">(optional)</span></span>
          <input
            autoComplete="tel"
            name="phone"
            type="tel"
            maxLength={32}
            placeholder="+254 700 000 000"
          />
        </label>
      </div>
      <label className="field">
        <span>Category <span className="muted">(optional)</span></span>
        <input name="category" maxLength={80} placeholder="e.g. Building materials" />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div className="form-actions">
        <button className="button button-secondary" disabled={pending}>
          {pending ? "Saving…" : "Add supplier"}
        </button>
      </div>
    </form>
  );
}

export function PurchaseOrderForm({
  action,
  suppliers,
  projects,
  currencyCode,
}: {
  action: FormAction;
  suppliers: Supplier[];
  projects: Project[];
  currencyCode: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="form-stack">
      <div className="form-grid-two">
        <label className="field">
          <span>Supplier</span>
          <select name="supplierId" required defaultValue="">
            <option value="" disabled>Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Project <span className="muted">(optional)</span></span>
          <select name="projectId" defaultValue="">
            <option value="">Company-wide purchase</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectCode} · {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>What do you need?</span>
        <input
          name="description"
          required
          minLength={3}
          maxLength={240}
          placeholder="e.g. 120 bags of cement, 42.5 grade"
        />
      </label>
      <div className="form-grid-two">
        <label className="field">
          <span>Estimated total ({currencyCode})</span>
          <input
            name="amount"
            type="number"
            min="0.01"
            max="21474836.47"
            step="0.01"
            required
            inputMode="decimal"
            placeholder="0.00"
          />
        </label>
        <label className="field">
          <span>Expected delivery <span className="muted">(optional)</span></span>
          <input name="expectedDelivery" type="date" />
        </label>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div className="form-actions">
        <button
          className="button button-primary"
          disabled={pending || suppliers.length === 0}
        >
          {pending ? "Submitting…" : "Submit for approval"}
        </button>
      </div>
    </form>
  );
}
