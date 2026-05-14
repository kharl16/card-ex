ALTER TABLE "IAM Files"
  ADD COLUMN IF NOT EXISTS details_heading text,
  ADD COLUMN IF NOT EXISTS details_rows jsonb NOT NULL DEFAULT '[]'::jsonb;