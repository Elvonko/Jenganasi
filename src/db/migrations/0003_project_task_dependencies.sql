CREATE UNIQUE INDEX IF NOT EXISTS project_task_project_id_unique
  ON project_task (project_id, id);

CREATE TABLE IF NOT EXISTS project_task_dependency (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  predecessor_task_id text NOT NULL,
  successor_task_id text NOT NULL,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_task_dependency_not_self_check
    CHECK (predecessor_task_id <> successor_task_id),
  CONSTRAINT project_task_dependency_predecessor_fk
    FOREIGN KEY (project_id, predecessor_task_id)
    REFERENCES project_task(project_id, id) ON DELETE CASCADE,
  CONSTRAINT project_task_dependency_successor_fk
    FOREIGN KEY (project_id, successor_task_id)
    REFERENCES project_task(project_id, id) ON DELETE CASCADE,
  UNIQUE (project_id, predecessor_task_id, successor_task_id)
);

CREATE INDEX IF NOT EXISTS project_task_dependency_successor_idx
  ON project_task_dependency (project_id, successor_task_id);
