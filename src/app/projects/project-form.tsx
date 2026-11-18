"use client";

import { useActionState } from "react";
import type { ProjectFormState } from "@/app/projects/actions";

type CustomerOption = {
  id: string;
  name: string;
  status: string;
};

type ProjectFormProps = {
  customers: CustomerOption[];
  templates?: { id: string; name: string }[];
  action: (
    previousState: ProjectFormState,
    formData: FormData,
  ) => Promise<ProjectFormState>;
  initial?: {
    id?: string;
    name?: string;
    location?: string;
    customerId?: string | null;
    status?: string;
    progressPercent?: number;
    startDate?: string | null;
    targetDate?: string | null;
  };
  submitLabel: string;
};

export function ProjectForm({
  action,
  customers,
  templates = [],
  initial,
  submitLabel,
}: ProjectFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="form-stack">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <label className="field">
        <span>Project name</span>
        <input
          autoComplete="off"
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={initial?.name}
          placeholder="e.g. Ridgeview family home"
        />
      </label>
      <label className="field">
        <span>Site location</span>
        <input
          name="location"
          maxLength={160}
          defaultValue={initial?.location}
          placeholder="Town, area or site address"
        />
      </label>
      <label className="field">
        <span>Customer <span className="muted">(optional)</span></span>
        <select name="customerId" defaultValue={initial?.customerId ?? ""}>
          <option value="">No customer linked</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}{customer.status === "inactive" ? " (inactive)" : ""}
            </option>
          ))}
        </select>
        {customers.length === 0 && (
          <span className="field-hint">
            No customer records yet. You can add one from Customers.
          </span>
        )}
      </label>
      {!initial?.id && templates.length > 0 && (
        <label className="field">
          <span>Project template <span className="muted">(optional)</span></span>
          <select name="templateId" defaultValue="">
            <option value="">Start without a template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <span className="field-hint">
            The template&apos;s starter tasks and milestones will be copied into this project.
          </span>
        </label>
      )}
      <div className="form-grid-two">
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={initial?.status ?? "planned"}>
            <option value="planned">Planned</option>
            <option value="in_progress">In progress</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="field">
          <span>Progress</span>
          <div className="input-suffix">
            <input
              name="progressPercent"
              type="number"
              min={0}
              max={100}
              step={1}
              defaultValue={initial?.progressPercent ?? 0}
            />
            <span>%</span>
          </div>
        </label>
      </div>
      <div className="form-grid-two">
        <label className="field">
          <span>Start date</span>
          <input
            name="startDate"
            type="date"
            defaultValue={initial?.startDate ?? ""}
          />
        </label>
        <label className="field">
          <span>Target completion</span>
          <input
            name="targetDate"
            type="date"
            defaultValue={initial?.targetDate ?? ""}
          />
        </label>
      </div>
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
