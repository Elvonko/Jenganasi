"use client";

import { useActionState } from "react";
import type { CompanyTemplateFormState } from "@/app/settings/actions";

type ProjectTemplateFormProps = {
  action: (
    previousState: CompanyTemplateFormState,
    formData: FormData,
  ) => Promise<CompanyTemplateFormState>;
};

export function ProjectTemplateForm({ action }: ProjectTemplateFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="form-stack">
      <label className="field">
        <span>Template name</span>
        <input name="name" required minLength={2} maxLength={120} />
      </label>
      <label className="field">
        <span>Starter tasks</span>
        <textarea
          name="taskTitles"
          rows={5}
          placeholder={"Site preparation\nFoundation inspection\nFinal handover"}
        />
        <span className="field-hint">One task title per line; up to 30.</span>
      </label>
      <label className="field">
        <span>Milestones</span>
        <textarea
          name="milestoneTitles"
          rows={4}
          placeholder={"Site ready\nStructure complete\nProject handover"}
        />
        <span className="field-hint">One milestone title per line; up to 30.</span>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
      <div className="form-actions">
        <button className="button button-primary" disabled={pending}>
          {pending ? "Saving…" : "Save project template"}
        </button>
      </div>
    </form>
  );
}
