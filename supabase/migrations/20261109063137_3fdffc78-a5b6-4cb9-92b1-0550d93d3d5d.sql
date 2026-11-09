ALTER TABLE public.ai_training_qa
  ADD COLUMN IF NOT EXISTS source_category text,
  ADD COLUMN IF NOT EXISTS source_image_id uuid,
  ADD COLUMN IF NOT EXISTS source_image_url text,
  ADD COLUMN IF NOT EXISTS source_image_url_2 text,
  ADD COLUMN IF NOT EXISTS source_caption text,
  ADD COLUMN IF NOT EXISTS source_srp text,
  ADD COLUMN IF NOT EXISTS source_extracted_text text,
  ADD COLUMN IF NOT EXISTS unverified_numbers text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS numbers_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS numbers_confirmed_by uuid;

ALTER TABLE public.ai_training_qa
  DROP CONSTRAINT IF EXISTS ai_training_qa_source_category_check;
ALTER TABLE public.ai_training_qa
  ADD CONSTRAINT ai_training_qa_source_category_check
  CHECK (source_category IS NULL OR source_category IN ('packages','products','brochures','testimonies'));

CREATE INDEX IF NOT EXISTS ai_training_qa_source_image_idx
  ON public.ai_training_qa (source_image_id) WHERE source_image_id IS NOT NULL;

-- Answers with unconfirmed numbers can never be active (the chatbot only reads active rows).
-- Editing an answer clears any earlier confirmation unless the same update re-confirms it.
CREATE OR REPLACE FUNCTION public.enforce_qa_number_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.answer IS DISTINCT FROM OLD.answer
     AND NEW.numbers_confirmed_at IS NOT DISTINCT FROM OLD.numbers_confirmed_at THEN
    NEW.numbers_confirmed_at := NULL;
    NEW.numbers_confirmed_by := NULL;
  END IF;

  IF NEW.numbers_confirmed_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.numbers_confirmed_at IS DISTINCT FROM OLD.numbers_confirmed_at) THEN
    NEW.numbers_confirmed_by := auth.uid();
  END IF;

  IF cardinality(COALESCE(NEW.unverified_numbers, '{}'::text[])) > 0
     AND NEW.numbers_confirmed_at IS NULL THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_qa_number_confirmation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_qa_number_confirmation ON public.ai_training_qa;
CREATE TRIGGER enforce_qa_number_confirmation
  BEFORE INSERT OR UPDATE ON public.ai_training_qa
  FOR EACH ROW EXECUTE FUNCTION public.enforce_qa_number_confirmation();