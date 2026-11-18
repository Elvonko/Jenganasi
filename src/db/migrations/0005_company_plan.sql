ALTER TABLE company
  ADD COLUMN IF NOT EXISTS plan_code text NOT NULL DEFAULT 'free'
  CHECK (plan_code IN ('free', 'premium', 'business'));
