CREATE TABLE IF NOT EXISTS rate_limit (
  key text PRIMARY KEY,
  count integer NOT NULL,
  last_request bigint NOT NULL DEFAULT 0
);

-- Accounts created before email verification was enabled are treated as verified
-- so the rollout does not lock existing users out.
UPDATE "user"
  SET email_verified = true, updated_at = now()
  WHERE email_verified = false;
