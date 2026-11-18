CREATE UNIQUE INDEX IF NOT EXISTS project_company_id_unique
  ON project (company_id, id);

CREATE TABLE IF NOT EXISTS project_client_access (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  user_id text NOT NULL,
  granted_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_client_access_company_project_fk
    FOREIGN KEY (company_id, project_id)
    REFERENCES project(company_id, id) ON DELETE CASCADE,
  CONSTRAINT project_client_access_company_member_fk
    FOREIGN KEY (company_id, user_id)
    REFERENCES company_membership(company_id, user_id) ON DELETE CASCADE,
  UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS project_client_access_user_idx
  ON project_client_access (user_id, project_id);

CREATE TABLE IF NOT EXISTS project_client_invitation (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_client_invitation_company_project_fk
    FOREIGN KEY (company_id, project_id)
    REFERENCES project(company_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS project_client_invitation_project_idx
  ON project_client_invitation (company_id, project_id);

CREATE TABLE IF NOT EXISTS project_media (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 180),
  content_type text NOT NULL,
  category text NOT NULL CHECK (category IN ('image', 'video', 'file')),
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 20971520),
  caption text NOT NULL DEFAULT '' CHECK (char_length(caption) <= 300),
  is_shared boolean NOT NULL DEFAULT false,
  data bytea NOT NULL,
  uploaded_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_media_company_project_fk
    FOREIGN KEY (company_id, project_id)
    REFERENCES project(company_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS project_media_project_created_idx
  ON project_media (company_id, project_id, created_at);
