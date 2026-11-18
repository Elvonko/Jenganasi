"use client";

import { useActionState } from "react";
import type { ProjectWorkFormState } from "@/app/projects/work-actions";

type ProjectWorkFormProps = {
  projectId: string;
  mode: "task" | "milestone" | "phase";
  phases?: { id: string; name: string }[];
  assignees?: { id: string; name: string; role: string }[];
  action: (
    previousState: ProjectWorkFormState,
    formData: FormData,
  ) => Promise<ProjectWorkFormState>;
};

export function ProjectWorkForm({
  projectId,
  mode,
  phases,
  assignees,
  action,
}: ProjectWorkFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const isTask = mode === "task";
  const taskAssignees = assignees ?? [];
  const taskPhases = phases ?? [];
  const isPhase = mode === "phase";
  const workType = isTask ? "task" : isPhase ? "phase" : "milestone";

  return (
    <form action={formAction} className="form-stack project-work-form">
      <input type="hidden" name="projectId" value={projectId} />
      <label className="field">
        <span>{isTask ? "Task" : isPhase ? "Phase" : "Milestone"}</span>
        <input
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder={
            isTask
              ? "e.g. Inspect foundation reinforcement"
              : isPhase
                ? "e.g. Foundation and structure"
                : "e.g. Foundation complete"
          }
        />
      </label>
      {isTask && (
        <label className="field">
          <span>Phase <span className="optional-label">Optional</span></span>
          <select name="phaseId" defaultValue="">
            <option value="">No phase</option>
            {taskPhases.map((phase) => (
              <option key={phase.id} value={phase.id}>{phase.name}</option>
            ))}
          </select>
        </label>
      )}
      {isTask && (
        <label className="field">
          <span>Details <span className="optional-label">Optional</span></span>
          <textarea
            name="description"
            rows={2}
            maxLength={500}
            placeholder="Add notes about the work"
          />
        </label>
      )}
      {isTask && (
        <label className="field">
          <span>Assign to <span className="optional-label">Optional</span></span>
          <select name="assigneeId" defaultValue="">
            <option value="">Unassigned</option>
            {taskAssignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name} — {assignee.role.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>{isTask ? "Due date" : "Target date"} <span className="optional-label">Optional</span></span>
        <input
          name={isTask ? "dueDate" : "targetDate"}
          type="date"
        />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="button button-secondary" disabled={pending}>
        {pending
          ? "Adding…"
          : `Add ${workType}`}
      </button>
    </form>
  );
}
