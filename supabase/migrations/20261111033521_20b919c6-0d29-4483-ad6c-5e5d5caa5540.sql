CREATE OR REPLACE FUNCTION public.record_ai_training_qa_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events text[] := '{}'::text[];
  v_actor uuid := auth.uid();
  v_old_held boolean := false;
  v_new_held boolean := false;
  v_reason text;
  v_row public.ai_training_qa;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_events := ARRAY['deleted']::text[];
  ELSE
    v_row := NEW;
    v_new_held := cardinality(COALESCE(NEW.unverified_numbers, '{}'::text[])) > 0 AND NEW.numbers_confirmed_at IS NULL;

    IF TG_OP = 'INSERT' THEN
      v_events := ARRAY['created']::text[];
      IF NEW.source_image_url IS NOT NULL THEN v_events := array_append(v_events, 'source_attached'::text); END IF;
      IF v_new_held THEN v_events := array_append(v_events, 'put_on_hold'::text); END IF;
      IF NEW.numbers_confirmed_at IS NOT NULL THEN v_events := array_append(v_events, 'confirmed'::text); END IF;
    ELSE
      v_old_held := cardinality(COALESCE(OLD.unverified_numbers, '{}'::text[])) > 0 AND OLD.numbers_confirmed_at IS NULL;

      IF NEW.question IS DISTINCT FROM OLD.question OR NEW.answer IS DISTINCT FROM OLD.answer THEN
        v_events := array_append(v_events, 'edited'::text);
      END IF;
      IF NEW.source_image_id IS DISTINCT FROM OLD.source_image_id
         OR NEW.source_image_url IS DISTINCT FROM OLD.source_image_url THEN
        v_events := array_append(v_events, (CASE WHEN OLD.source_image_url IS NULL THEN 'source_attached'
                                     WHEN NEW.source_image_url IS NULL THEN 'source_removed'
                                     ELSE 'source_changed' END)::text);
      END IF;
      IF v_new_held AND (NOT v_old_held OR NEW.unverified_numbers IS DISTINCT FROM OLD.unverified_numbers) THEN
        v_events := array_append(v_events, 'put_on_hold'::text);
      END IF;
      IF NEW.numbers_confirmed_at IS NOT NULL AND NEW.numbers_confirmed_at IS DISTINCT FROM OLD.numbers_confirmed_at THEN
        v_events := array_append(v_events, 'confirmed'::text);
      END IF;
      IF v_old_held AND NOT v_new_held AND NOT ('confirmed' = ANY(v_events)) THEN
        v_events := array_append(v_events, 'hold_cleared'::text);
      END IF;
      IF NEW.is_active IS DISTINCT FROM OLD.is_active
         AND NOT ('put_on_hold' = ANY(v_events)) AND NOT ('confirmed' = ANY(v_events)) THEN
        v_events := array_append(v_events, (CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END)::text);
      END IF;

      IF cardinality(v_events) = 0 THEN
        RETURN NULL;
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
    v_row.is_active, COALESCE(v_row.unverified_numbers, '{}'::text[]), v_reason,
    v_row.numbers_confirmed_at, v_row.numbers_confirmed_by,
    public.qa_history_person_name(v_row.numbers_confirmed_by)
  );

  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_ai_training_qa_history() FROM PUBLIC, anon, authenticated;