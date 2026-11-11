CREATE TABLE public.ai_training_qa_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qa_id uuid NOT NULL,
  card_id uuid,
  events text[] NOT NULL DEFAULT '{}',
  actor_id uuid,
  actor_name text,
  question text,
  answer text,
  previous_question text,
  previous_answer text,
  source_category text,
  source_image_id uuid,
  source_image_url text,
  source_caption text,
  previous_source_image_url text,
  previous_source_caption text,
  is_active boolean,
  unverified_numbers text[] NOT NULL DEFAULT '{}',
  hold_reason text,
  numbers_confirmed_at timestamptz,
  numbers_confirmed_by uuid,
  confirmed_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_training_qa_history_qa_idx ON public.ai_training_qa_history (qa_id, created_at DESC);

GRANT SELECT ON public.ai_training_qa_history TO authenticated;
GRANT ALL ON public.ai_training_qa_history TO service_role;

ALTER TABLE public.ai_training_qa_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read Q&A history"
  ON public.ai_training_qa_history FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Card owners can read their Q&A history"
  ON public.ai_training_qa_history FOR SELECT TO authenticated
  USING (card_id IS NOT NULL AND card_id IN (SELECT c.id FROM public.cards c WHERE c.user_id = auth.uid()));

CREATE POLICY "Exclude guest sessions"
  ON public.ai_training_qa_history AS RESTRICTIVE FOR SELECT TO authenticated
  USING (COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

CREATE OR REPLACE FUNCTION public.qa_history_person_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(btrim((SELECT p.full_name FROM public.profiles p WHERE p.id = _user_id)), ''),
    (SELECT u.email::text FROM auth.users u WHERE u.id = _user_id)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.qa_history_person_name(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_ai_training_qa_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events text[] := '{}';
  v_actor uuid := auth.uid();
  v_old_held boolean := false;
  v_new_held boolean := false;
  v_reason text;
  v_row public.ai_training_qa;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_events := ARRAY['deleted'];
  ELSE
    v_row := NEW;
    v_new_held := cardinality(COALESCE(NEW.unverified_numbers, '{}')) > 0 AND NEW.numbers_confirmed_at IS NULL;

    IF TG_OP = 'INSERT' THEN
      v_events := ARRAY['created'];
      IF NEW.source_image_url IS NOT NULL THEN v_events := v_events || 'source_attached'; END IF;
      IF v_new_held THEN v_events := v_events || 'put_on_hold'; END IF;
      IF NEW.numbers_confirmed_at IS NOT NULL THEN v_events := v_events || 'confirmed'; END IF;
    ELSE
      v_old_held := cardinality(COALESCE(OLD.unverified_numbers, '{}')) > 0 AND OLD.numbers_confirmed_at IS NULL;

      IF NEW.question IS DISTINCT FROM OLD.question OR NEW.answer IS DISTINCT FROM OLD.answer THEN
        v_events := v_events || 'edited';
      END IF;
      IF NEW.source_image_id IS DISTINCT FROM OLD.source_image_id
         OR NEW.source_image_url IS DISTINCT FROM OLD.source_image_url THEN
        v_events := v_events || CASE WHEN OLD.source_image_url IS NULL THEN 'source_attached'
                                     WHEN NEW.source_image_url IS NULL THEN 'source_removed'
                                     ELSE 'source_changed' END;
      END IF;
      IF v_new_held AND (NOT v_old_held OR NEW.unverified_numbers IS DISTINCT FROM OLD.unverified_numbers) THEN
        v_events := v_events || 'put_on_hold';
      END IF;
      IF NEW.numbers_confirmed_at IS NOT NULL AND NEW.numbers_confirmed_at IS DISTINCT FROM OLD.numbers_confirmed_at THEN
        v_events := v_events || 'confirmed';
      END IF;
      IF v_old_held AND NOT v_new_held AND NOT ('confirmed' = ANY(v_events)) THEN
        v_events := v_events || 'hold_cleared';
      END IF;
      IF NEW.is_active IS DISTINCT FROM OLD.is_active
         AND NOT ('put_on_hold' = ANY(v_events)) AND NOT ('confirmed' = ANY(v_events)) THEN
        v_events := v_events || CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END;
      END IF;

      IF cardinality(v_events) = 0 THEN
        RETURN NULL; -- reordering and timestamp-only changes are not verification events
      END IF;
    END IF;

    IF 'put_on_hold' = ANY(v_events) THEN
      v_reason := array_to_string(NEW.unverified_numbers, ', ')
        || CASE WHEN cardinality(NEW.unverified_numbers) > 1 THEN ' were' ELSE ' was' END
        || ' not found on the source photo';
      IF TG_OP = 'UPDATE' THEN
        IF 'source_changed' = ANY(v_events) OR 'source_attached' = ANY(v_events) THEN
          v_reason := v_reason || ' after the source photo was changed';
        ELSIF 'edited' = ANY(v_events) AND OLD.numbers_confirmed_at IS NOT NULL THEN
          v_reason := v_reason || '; the answer was edited after it had been confirmed';
        ELSIF 'edited' = ANY(v_events) THEN
          v_reason := v_reason || ' after the answer was edited';
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.ai_training_qa_history (
    qa_id, card_id, events, actor_id, actor_name,
    question, answer, previous_question, previous_answer,
    source_category, source_image_id, source_image_url, source_caption,
    previous_source_image_url, previous_source_caption,
    is_active, unverified_numbers, hold_reason,
    numbers_confirmed_at, numbers_confirmed_by, confirmed_by_name
  ) VALUES (
    v_row.id, v_row.card_id, v_events, v_actor, public.qa_history_person_name(v_actor),
    v_row.question, v_row.answer,
    CASE WHEN TG_OP = 'UPDATE' AND NEW.question IS DISTINCT FROM OLD.question THEN OLD.question END,
    CASE WHEN TG_OP = 'UPDATE' AND NEW.answer IS DISTINCT FROM OLD.answer THEN OLD.answer END,
    v_row.source_category, v_row.source_image_id, v_row.source_image_url, v_row.source_caption,
    CASE WHEN TG_OP = 'UPDATE' AND NEW.source_image_url IS DISTINCT FROM OLD.source_image_url THEN OLD.source_image_url END,
    CASE WHEN TG_OP = 'UPDATE' AND NEW.source_image_url IS DISTINCT FROM OLD.source_image_url THEN OLD.source_caption END,
    v_row.is_active, COALESCE(v_row.unverified_numbers, '{}'), v_reason,
    v_row.numbers_confirmed_at, v_row.numbers_confirmed_by,
    public.qa_history_person_name(v_row.numbers_confirmed_by)
  );

  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_ai_training_qa_history() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER record_ai_training_qa_history
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_training_qa
  FOR EACH ROW EXECUTE FUNCTION public.record_ai_training_qa_history();

-- Starting point for answers saved before history tracking began
INSERT INTO public.ai_training_qa_history (
  qa_id, card_id, events, question, answer, source_category, source_image_id, source_image_url,
  source_caption, is_active, unverified_numbers, hold_reason, note, created_at
)
SELECT q.id, q.card_id,
  CASE WHEN cardinality(COALESCE(q.unverified_numbers,'{}')) > 0 AND q.numbers_confirmed_at IS NULL
       THEN ARRAY['created','put_on_hold'] ELSE ARRAY['created'] END,
  q.question, q.answer, q.source_category, q.source_image_id, q.source_image_url, q.source_caption,
  q.is_active, COALESCE(q.unverified_numbers,'{}'),
  CASE WHEN cardinality(COALESCE(q.unverified_numbers,'{}')) > 0 AND q.numbers_confirmed_at IS NULL
       THEN array_to_string(q.unverified_numbers, ', ') || ' not found on the source photo' END,
  'Recorded before history tracking began', q.created_at
FROM public.ai_training_qa q;

INSERT INTO public.ai_training_qa_history (
  qa_id, card_id, events, actor_id, actor_name, question, answer, source_category, source_image_id,
  source_image_url, source_caption, is_active, unverified_numbers, numbers_confirmed_at,
  numbers_confirmed_by, confirmed_by_name, note, created_at
)
SELECT q.id, q.card_id, ARRAY['confirmed'], q.numbers_confirmed_by,
  public.qa_history_person_name(q.numbers_confirmed_by), q.question, q.answer, q.source_category,
  q.source_image_id, q.source_image_url, q.source_caption, q.is_active, COALESCE(q.unverified_numbers,'{}'),
  q.numbers_confirmed_at, q.numbers_confirmed_by, public.qa_history_person_name(q.numbers_confirmed_by),
  'Recorded before history tracking began', q.numbers_confirmed_at
FROM public.ai_training_qa q
WHERE q.numbers_confirmed_at IS NOT NULL;