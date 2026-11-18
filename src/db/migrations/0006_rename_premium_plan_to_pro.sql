ALTER TABLE company
  DROP CONSTRAINT IF EXISTS company_plan_code_check;

UPDATE company
  SET plan_code = 'pro'
  WHERE plan_code = 'premium';

ALTER TABLE company
  ADD CONSTRAINT company_plan_code_check
  CHECK (plan_code IN ('free', 'pro', 'business'));
