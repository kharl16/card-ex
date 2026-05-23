
DO $$
DECLARE
  promo_url TEXT := 'https://tagex.app/ads/iam-tag-init-may-2026.jpg';
  promo_alt TEXT := 'IAM Worldwide Tag-Init aMAYzing 3-Day Promo (May 23-25, 2026)';
  new_item JSONB := jsonb_build_object('url', promo_url, 'alt', promo_alt);
  r RECORD;
  cur JSONB;
  items JSONB;
  next_banner JSONB;
  already_has BOOLEAN;
BEGIN
  FOR r IN SELECT id, ad_banner FROM public.cards LOOP
    cur := r.ad_banner;

    IF cur IS NULL OR cur = 'null'::jsonb THEN
      next_banner := jsonb_build_object(
        'type', 'image',
        'autoPlayMs', 4000,
        'items', jsonb_build_array(new_item)
      );
    ELSIF cur->>'type' = 'image' THEN
      IF cur ? 'items' AND jsonb_typeof(cur->'items') = 'array' THEN
        items := cur->'items';
      ELSIF cur ? 'url' THEN
        items := jsonb_build_array(jsonb_build_object('url', cur->>'url'));
      ELSE
        items := '[]'::jsonb;
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(items) e WHERE e->>'url' = promo_url
      ) INTO already_has;

      IF already_has THEN
        CONTINUE;
      END IF;

      items := items || jsonb_build_array(new_item);
      next_banner := jsonb_build_object(
        'type', 'image',
        'autoPlayMs', COALESCE((cur->>'autoPlayMs')::int, 4000),
        'items', items
      );
      IF cur ? 'link' THEN
        next_banner := next_banner || jsonb_build_object('link', cur->>'link');
      END IF;
    ELSE
      -- video or unknown shape: skip
      CONTINUE;
    END IF;

    UPDATE public.cards SET ad_banner = next_banner WHERE id = r.id;
  END LOOP;
END $$;
