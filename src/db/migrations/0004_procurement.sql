CREATE TABLE IF NOT EXISTS supplier (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  email text,
  phone text,
  category text NOT NULL DEFAULT '' CHECK (char_length(category) <= 80),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id)
);
CREATE INDEX IF NOT EXISTS supplier_company_status_name_idx
  ON supplier (company_id, status, name);

CREATE TABLE IF NOT EXISTS purchase_order (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  reference text NOT NULL,
  supplier_id text NOT NULL,
  project_id text,
  description text NOT NULL CHECK (char_length(description) BETWEEN 3 AND 240),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  expected_delivery date,
  status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
    'pending_approval', 'approved', 'ordered', 'received', 'cancelled'
  )),
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id),
  UNIQUE (company_id, reference),
  CONSTRAINT purchase_order_company_supplier_fk
    FOREIGN KEY (company_id, supplier_id)
    REFERENCES supplier(company_id, id) ON DELETE RESTRICT,
  CONSTRAINT purchase_order_company_project_fk
    FOREIGN KEY (company_id, project_id)
    REFERENCES project(company_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS purchase_order_company_status_created_idx
  ON purchase_order (company_id, status, created_at);
