-- One-time backfill: mirror cards.social_links -> card_links table.
-- Safe: only touches "social" kinds; leaves phone/sms/email/url contact rows intact.

CREATE OR REPLACE FUNCTION public.backfill_card_links_from_social_links()
RETURNS TABLE(card_id uuid, inserted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card RECORD;
  v_link jsonb;
  v_kind text;
  v_label text;
  v_value text;
  v_icon text;
  v_idx int;
  v_inserted int;
  v_allowed_kinds text[] := ARRAY[
    'whatsapp','messenger','telegram','viber','facebook','instagram',
    'tiktok','x','youtube','linkedin','url','custom'
  ];
  v_social_kinds link_kind[] := ARRAY[
    'whatsapp','messenger','telegram','viber','facebook','instagram',
    'tiktok','x','youtube','linkedin','url','custom'
  ]::link_kind[];
BEGIN
  FOR v_card IN
    SELECT c.id, c.social_links
    FROM public.cards c
    WHERE c.social_links IS NOT NULL
      AND jsonb_typeof(c.social_links) = 'array'
      AND jsonb_array_length(c.social_links) > 0
  LOOP
    DELETE FROM public.card_links
    WHERE card_links.card_id = v_card.id
      AND card_links.kind = ANY (v_social_kinds);

    v_idx := 0;
    v_inserted := 0;

    FOR v_link IN SELECT * FROM jsonb_array_elements(v_card.social_links)
    LOOP
      v_kind  := lower(COALESCE(v_link->>'kind', ''));
      v_label := COALESCE(v_link->>'label', '');
      v_value := COALESCE(v_link->>'value', '');
      v_icon  := NULLIF(COALESCE(v_link->>'icon', ''), '');

      IF v_value = '' OR v_label = '' THEN
        v_idx := v_idx + 1;
        CONTINUE;
      END IF;

      IF NOT (v_kind = ANY (v_allowed_kinds)) THEN
        v_kind := 'custom';
      END IF;

      INSERT INTO public.card_links (card_id, kind, label, value, icon, sort_index)
      VALUES (v_card.id, v_kind::link_kind, v_label, v_value, v_icon, v_idx);

      v_inserted := v_inserted + 1;
      v_idx := v_idx + 1;
    END LOOP;

    card_id := v_card.id;
    inserted_count := v_inserted;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

-- Execute the backfill once.
SELECT * FROM public.backfill_card_links_from_social_links();

-- Drop the helper so it can't be accidentally re-run.
DROP FUNCTION public.backfill_card_links_from_social_links();