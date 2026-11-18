CREATE TABLE IF NOT EXISTS subscription (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  plan_code text NOT NULL CHECK (plan_code IN ('free', 'pro', 'business')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  msisdn text,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  auto_renew boolean NOT NULL DEFAULT false,
  auto_renew_consent_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE TABLE IF NOT EXISTS mpesa_payment (
  id text PRIMARY KEY,
  company_id text NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  subscription_id text REFERENCES subscription(id) ON DELETE SET NULL,
  initiated_by text REFERENCES "user"(id) ON DELETE SET NULL,
  plan_code text NOT NULL CHECK (plan_code IN ('free', 'pro', 'business')),
  amount_kes integer NOT NULL CHECK (amount_kes > 0),
  merchant_request_id text,
  checkout_request_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'reversed')),
  result_code text,
  result_desc text,
  mpesa_receipt_number text,
  phone_number text,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS mpesa_payment_checkout_unique
  ON mpesa_payment (checkout_request_id);
CREATE INDEX IF NOT EXISTS mpesa_payment_company_initiated_idx
  ON mpesa_payment (company_id, initiated_at);
CREATE INDEX IF NOT EXISTS subscription_renewal_idx
  ON subscription (status, current_period_end);
