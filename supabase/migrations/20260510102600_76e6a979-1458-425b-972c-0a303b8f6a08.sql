DO $$
DECLARE
  rec RECORD;
  fb_url TEXT;
  fb_path TEXT;
  username TEXT;
  messenger_url TEXT;
  has_messenger BOOLEAN;
  new_social_links JSONB;
BEGIN
  FOR rec IN
    SELECT id, social_links
    FROM public.cards
    WHERE social_links IS NOT NULL
      AND jsonb_typeof(social_links) = 'array'
      AND social_links @> '[{"kind":"facebook"}]'::jsonb
  LOOP
    SELECT COALESCE(elem->>'value', elem->>'url')
      INTO fb_url
    FROM jsonb_array_elements(rec.social_links) elem
    WHERE lower(COALESCE(elem->>'kind', '')) = 'facebook'
      AND COALESCE(elem->>'value', elem->>'url', '') <> ''
    LIMIT 1;

    IF fb_url IS NULL OR trim(fb_url) = '' THEN
      CONTINUE;
    END IF;

    IF position('profile.php' in lower(fb_url)) > 0 THEN
      username := substring(fb_url from '[?&]id=([0-9]+)');
    ELSE
      fb_path := regexp_replace(fb_url, '^https?://(www\.|web\.|m\.|mobile\.)?(facebook\.com|fb\.com|fb\.me)/?', '', 'i');
      fb_path := regexp_replace(fb_path, '[?#].*$', '');
      fb_path := regexp_replace(fb_path, '/+$', '');
      fb_path := trim(fb_path);
      username := split_part(fb_path, '/', 1);
    END IF;

    IF username IS NULL OR trim(username) = '' THEN
      CONTINUE;
    END IF;

    messenger_url := 'https://m.me/' || username;

    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(rec.social_links) elem
      WHERE lower(COALESCE(elem->>'kind', '')) = 'messenger'
    ) INTO has_messenger;

    IF has_messenger THEN
      SELECT jsonb_agg(
        CASE
          WHEN lower(COALESCE(elem->>'kind', '')) = 'messenger'
            AND COALESCE(elem->>'value', '') IN ('', 'https://m.me/', 'http://m.me/')
          THEN elem || jsonb_build_object('value', messenger_url, 'url', messenger_url, 'label', 'Messenger', 'icon', 'Messenger')
          ELSE elem
        END
        ORDER BY ord
      ) INTO new_social_links
      FROM jsonb_array_elements(rec.social_links) WITH ORDINALITY AS t(elem, ord);
    ELSE
      new_social_links := rec.social_links || jsonb_build_array(jsonb_build_object(
        'id', 'link-messenger-' || extract(epoch from now())::bigint::text || '-' || rec.id,
        'kind', 'messenger',
        'label', 'Messenger',
        'icon', 'Messenger',
        'url', messenger_url,
        'value', messenger_url
      ));
    END IF;

    UPDATE public.cards
    SET social_links = new_social_links,
        updated_at = now()
    WHERE id = rec.id
      AND social_links IS DISTINCT FROM new_social_links;

    UPDATE public.card_links
    SET value = messenger_url,
        icon = COALESCE(icon, 'Messenger')
    WHERE card_id = rec.id
      AND kind = 'messenger'
      AND COALESCE(value, '') IN ('', 'https://m.me/', 'http://m.me/');

    IF NOT EXISTS (
      SELECT 1 FROM public.card_links
      WHERE card_id = rec.id AND kind = 'messenger'
    ) THEN
      INSERT INTO public.card_links (card_id, kind, label, value, icon, sort_index)
      VALUES (rec.id, 'messenger', 'Messenger', messenger_url, 'Messenger', 2);
    END IF;
  END LOOP;
END $$;