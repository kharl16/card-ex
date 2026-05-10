
DO $$
DECLARE
  rec RECORD;
  fb_url TEXT;
  fb_path TEXT;
  username TEXT;
  messenger_url TEXT;
  new_entry JSONB;
BEGIN
  FOR rec IN
    SELECT id, social_links
    FROM public.cards
    WHERE social_links @> '[{"kind":"facebook"}]'::jsonb
      AND NOT (social_links @> '[{"kind":"messenger"}]'::jsonb)
  LOOP
    -- Extract the first facebook value
    SELECT (elem->>'value')
      INTO fb_url
    FROM jsonb_array_elements(rec.social_links) elem
    WHERE elem->>'kind' = 'facebook'
      AND COALESCE(elem->>'value','') <> ''
    LIMIT 1;

    IF fb_url IS NULL OR fb_url = '' THEN
      CONTINUE;
    END IF;

    -- Strip protocol, host, query, fragment, trailing slashes
    fb_path := regexp_replace(fb_url, '^https?://(www\.|web\.|m\.|mobile\.)?facebook\.com/', '', 'i');
    fb_path := regexp_replace(fb_path, '[?#].*$', '');
    fb_path := regexp_replace(fb_path, '/+$', '');
    fb_path := trim(fb_path);

    IF fb_path IS NULL OR fb_path = '' THEN
      CONTINUE;
    END IF;

    -- Handle profile.php?id=NUM (we already stripped query, so check original)
    IF position('profile.php' in lower(fb_url)) > 0 THEN
      username := substring(fb_url from 'id=([0-9]+)');
      IF username IS NULL OR username = '' THEN
        CONTINUE;
      END IF;
    ELSE
      -- Take only the first path segment (the username)
      username := split_part(fb_path, '/', 1);
    END IF;

    IF username IS NULL OR username = '' THEN
      CONTINUE;
    END IF;

    messenger_url := 'https://m.me/' || username;

    new_entry := jsonb_build_object(
      'id', 'link-msgr-' || extract(epoch from now())::bigint::text || '-' || rec.id,
      'kind', 'messenger',
      'label', 'Messenger',
      'icon', 'Messenger',
      'value', messenger_url
    );

    UPDATE public.cards
    SET social_links = COALESCE(social_links, '[]'::jsonb) || jsonb_build_array(new_entry),
        updated_at = now()
    WHERE id = rec.id;
  END LOOP;
END $$;
