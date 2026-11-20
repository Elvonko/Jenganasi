CREATE TABLE IF NOT EXISTS two_factor (
  id text PRIMARY KEY,
  secret text NOT NULL,
  backup_codes text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  verified boolean NOT NULL DEFAULT true,
  failed_verification_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz
);
CREATE INDEX IF NOT EXISTS two_factor_secret_idx ON two_factor (secret);
CREATE INDEX IF NOT EXISTS two_factor_user_id_idx ON two_factor (user_id);
