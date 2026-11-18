"use client";

import { useActionState } from "react";
import type { EstimateFormState } from "@/app/estimates/actions";

type EstimateFormProps = {
  projects: { id: string; projectCode: string; name: string }[];
  templates?: { id: string; name: string }[];
  action: (
    previousState: EstimateFormState,
    formData: FormData,
  ) => Promise<EstimateFormState>;
};

export function EstimateForm({ projects, templates = [], action }: EstimateFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="form-stack">
      <label className="field">
        <span>Project</span>
        <select name="projectId" required defaultValue="">
          <option value="" disabled>Choose a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectCode} — {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Estimate name</span>
        <input
          autoComplete="off"
          name="name"
          required
          minLength={3}
          maxLength={120}
          placeholder="e.g. Initial build estimate"
        />
      </label>
      {templates.length > 0 && (
        <label className="field">
          <span>Estimate template <span className="muted">(optional)</span></span>
          <select name="templateId" defaultValue="">
            <option value="">Start with an empty estimate</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <span className="field-hint">
            The BOQ items will be copied into this draft estimate.
          </span>
        </label>
      )}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div className="form-actions">
        <button className="button button-primary" disabled={pending}>
          {pending ? "Creating…" : "Create estimate"}
        </button>
      </div>
    </form>
  );
}
