ALTER TABLE project_media ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE project_media ALTER COLUMN data DROP NOT NULL;
UPDATE project_media SET storage_key = 'legacy:' || id WHERE storage_key IS NULL AND data IS NOT NULL;
