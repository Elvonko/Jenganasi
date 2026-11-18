"use client";

import { useActionState } from "react";
import type { EstimateFormState } from "@/app/estimates/actions";

type EstimateLineItemFormProps = {
  estimateId: string;
  currencyCode: string;
  action: (
    previousState: EstimateFormState,
    formData: FormData,
  ) => Promise<EstimateFormState>;
};

export function EstimateLineItemForm({
  estimateId,
  currencyCode,
  action,
}: EstimateLineItemFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="estimate-item-form">
      <input type="hidden" name="estimateId" value={estimateId} />
      <div className="estimate-item-form-grid">
        <label className="field">
          <span>Cost type</span>
          <select name="category" defaultValue="materials">
            <option value="materials">Materials</option>
            <option value="labour">Labour</option>
            <option value="equipment">Equipment</option>
            <option value="subcontract">Subcontract</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="field estimate-description-field">
          <span>Description</span>
          <input
            name="description"
            required
            minLength={2}
            maxLength={180}
            placeholder="e.g. Concrete for ground floor slab"
          />
        </label>
        <label className="field">
          <span>Unit</span>
          <input name="unit" required maxLength={24} placeholder="m³, bag, day" />
        </label>
        <label className="field">
          <span>Quantity</span>
          <input
            name="quantity"
            type="number"
            required
            min="0.001"
            max="999999999"
            step="0.001"
            defaultValue="1"
          />
        </label>
        <label className="field">
          <span>Rate ({currencyCode})</span>
          <input
            name="unitRate"
            type="number"
            required
            min="0"
            max="999999999999"
            step="0.01"
            placeholder="0.00"
          />
        </label>
        <button className="button button-primary estimate-add-item" disabled={pending}>
          {pending ? "Adding…" : "Add item"}
        </button>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}
