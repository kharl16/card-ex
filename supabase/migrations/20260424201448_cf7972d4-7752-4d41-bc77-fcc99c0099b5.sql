-- Enforce unique template name per owner (case-insensitive) for data integrity
CREATE UNIQUE INDEX IF NOT EXISTS card_templates_owner_name_unique_idx
  ON public.card_templates (owner_id, lower(name));