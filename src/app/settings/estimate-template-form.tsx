"use client";

import { useActionState, useState } from "react";
import type { CompanyTemplateFormState } from "@/app/settings/actions";

type EstimateTemplateFormProps = {
  action: (
    previousState: CompanyTemplateFormState,
    formData: FormData,
  ) => Promise<CompanyTemplateFormState>;
};

type LineItemDraft = {
  id: number;
  category: string;
};

const categories = [
  ["materials", "Materials"],
  ["labour", "Labour"],
  ["equipment", "Equipment"],
  ["subcontract", "Subcontract"],
  ["other", "Other"],
];

export function EstimateTemplateForm({ action }: EstimateTemplateFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [items, setItems] = useState<LineItemDraft[]>([
    { id: 0, category: "materials" },
  ]);
  const [nextId, setNextId] = useState(1);

  function addItem() {
    if (items.length >= 50) return;
    setItems([...items, { id: nextId, category: "materials" }]);
    setNextId(nextId + 1);
  }

  return (
    <form action={formAction} className="form-stack">
      <label className="field">
        <span>Template name</span>
        <input name="name" required minLength={2} maxLength={120} />
      </label>
      <div className="form-stack">
        {items.map((item, index) => (
          <fieldset className="panel form-stack" key={item.id}>
            <legend>Cost item {index + 1}</legend>
            <div className="form-grid-two">
              <label className="field">
                <span>Category</span>
                <select name="category" defaultValue={item.category}>
                  {categories.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Description</span>
                <input name="description" required maxLength={180} />
              </label>
            </div>
            <div className="form-grid-three">
              <label className="field">
                <span>Unit</span>
                <input name="unit" required maxLength={24} placeholder="m², bag, day" />
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
                />
              </label>
              <label className="field">
                <span>Unit rate</span>
                <input
                  name="unitRate"
                  type="number"
                  required
                  min="0"
                  max="999999999999"
                  step="0.01"
                />
              </label>
            </div>
            {items.length > 1 && (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setItems(items.filter(({ id }) => id !== item.id))}
              >
                Remove item
              </button>
            )}
          </fieldset>
        ))}
        <button
          className="button button-secondary"
          type="button"
          disabled={items.length >= 50}
          onClick={addItem}
        >
          Add cost item
        </button>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
      <div className="form-actions">
        <button className="button button-primary" disabled={pending}>
          {pending ? "Saving…" : "Save estimate template"}
        </button>
      </div>
    </form>
  );
}
