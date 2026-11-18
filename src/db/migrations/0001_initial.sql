CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique ON "user" (email);

CREATE TABLE IF NOT EXISTS "session" (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS session_token_unique ON "session" (token);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session" (user_id);

CREATE TABLE IF NOT EXISTS "account" (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account" (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS account_provider_account_unique
  ON "account" (provider_id, account_id);

CREATE TABLE IF NOT EXISTS "verification" (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx
  ON "verification" (identifier);

CREATE TABLE IF NOT EXISTS company (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  country_code text NOT NULL DEFAULT 'KE',
  currency_code text NOT NULL DEFAULT 'KES',
  timezone text NOT NULL DEFAULT 'Africa/Nairobi',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_membership (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'owner', 'admin', 'project_manager', 'site_supervisor',
    'accountant', 'procurement_officer', 'storekeeper',
    'sales_representative', 'subcontractor', 'client'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
CREATE INDEX IF NOT EXISTS membership_user_id_idx
  ON company_membership (user_id);

CREATE TABLE IF NOT EXISTS company_template (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('project', 'estimate')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  data jsonb NOT NULL,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, template_type, name)
);
CREATE INDEX IF NOT EXISTS company_template_company_type_idx
  ON company_template (company_id, template_type);

CREATE TABLE IF NOT EXISTS customer (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  email text,
  phone text,
  address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id)
);
CREATE INDEX IF NOT EXISTS customer_company_status_name_idx
  ON customer (company_id, status, name);

CREATE TABLE IF NOT EXISTS audit_event (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  actor_user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_company_occurred_idx
  ON audit_event (company_id, occurred_at);
CREATE INDEX IF NOT EXISTS audit_resource_idx
  ON audit_event (company_id, resource_type, resource_id);

CREATE TABLE IF NOT EXISTS project (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  project_code text NOT NULL,
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  customer_id text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'on_hold', 'completed', 'archived'
  )),
  progress_percent integer NOT NULL DEFAULT 0 CHECK (
    progress_percent >= 0 AND progress_percent <= 100
  ),
  start_date date,
  target_date date,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, project_code),
  CONSTRAINT project_company_customer_fk
    FOREIGN KEY (company_id, customer_id)
    REFERENCES customer(company_id, id) ON DELETE RESTRICT
);
ALTER TABLE project ADD COLUMN IF NOT EXISTS customer_id text;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_company_customer_fk'
  ) THEN
    ALTER TABLE project
      ADD CONSTRAINT project_company_customer_fk
      FOREIGN KEY (company_id, customer_id)
      REFERENCES customer(company_id, id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS project_company_status_idx
  ON project (company_id, status);
CREATE INDEX IF NOT EXISTS project_company_created_at_idx
  ON project (company_id, created_at);

CREATE TABLE IF NOT EXISTS project_phase (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  status text NOT NULL DEFAULT 'planned' CHECK (
    status IN ('planned', 'in_progress', 'completed')
  ),
  position integer NOT NULL CHECK (position > 0),
  target_date date,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, position)
);
CREATE INDEX IF NOT EXISTS project_phase_project_status_idx
  ON project_phase (project_id, status);

CREATE TABLE IF NOT EXISTS project_task (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  phase_id text REFERENCES project_phase(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  status text NOT NULL DEFAULT 'todo' CHECK (
    status IN ('todo', 'in_progress', 'completed')
  ),
  due_date date,
  assigned_to text,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE project_task ADD COLUMN IF NOT EXISTS phase_id text;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_task_phase_fk'
  ) THEN
    ALTER TABLE project_task
      ADD CONSTRAINT project_task_phase_fk
      FOREIGN KEY (phase_id) REFERENCES project_phase(id) ON DELETE SET NULL;
  END IF;
END $$;
ALTER TABLE project_task ADD COLUMN IF NOT EXISTS assigned_to text;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_task_assigned_to_fk'
  ) THEN
    ALTER TABLE project_task
      ADD CONSTRAINT project_task_assigned_to_fk
      FOREIGN KEY (assigned_to) REFERENCES "user"(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS project_task_project_status_idx
  ON project_task (project_id, status);
CREATE INDEX IF NOT EXISTS project_task_project_due_date_idx
  ON project_task (project_id, due_date);
CREATE INDEX IF NOT EXISTS project_task_assigned_to_idx
  ON project_task (assigned_to);

CREATE TABLE IF NOT EXISTS project_milestone (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  target_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (
    status IN ('planned', 'completed')
  ),
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_milestone_project_status_idx
  ON project_milestone (project_id, status);
CREATE INDEX IF NOT EXISTS project_milestone_project_target_date_idx
  ON project_milestone (project_id, target_date);

CREATE TABLE IF NOT EXISTS estimate (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  reference text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'approved', 'revision_requested'
  )),
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, reference)
);
CREATE INDEX IF NOT EXISTS estimate_company_created_at_idx
  ON estimate (company_id, created_at);
CREATE INDEX IF NOT EXISTS estimate_project_idx
  ON estimate (project_id);

CREATE TABLE IF NOT EXISTS estimate_line_item (
  id text PRIMARY KEY,
  estimate_id text NOT NULL REFERENCES estimate(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'materials', 'labour', 'equipment', 'subcontract', 'other'
  )),
  description text NOT NULL,
  unit text NOT NULL,
  quantity numeric(12, 3) NOT NULL CHECK (quantity > 0),
  unit_rate numeric(14, 2) NOT NULL CHECK (unit_rate >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS estimate_line_item_estimate_idx
  ON estimate_line_item (estimate_id);
