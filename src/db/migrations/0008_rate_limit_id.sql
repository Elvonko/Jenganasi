ALTER TABLE rate_limit DROP CONSTRAINT IF EXISTS rate_limit_pkey;
ALTER TABLE rate_limit ADD COLUMN IF NOT EXISTS id text;
UPDATE rate_limit SET id = key WHERE id IS NULL;
ALTER TABLE rate_limit ALTER COLUMN id SET NOT NULL;
ALTER TABLE rate_limit ADD CONSTRAINT rate_limit_pkey PRIMARY KEY (id);
ALTER TABLE rate_limit ADD CONSTRAINT rate_limit_key_unique UNIQUE (key);
