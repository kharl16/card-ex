
WITH filtered AS (
  SELECT
    c.id,
    jsonb_set(
      c.ad_banner,
      '{items}',
      COALESCE((
        SELECT jsonb_agg(item)
        FROM jsonb_array_elements(c.ad_banner->'items') item
        WHERE NOT (
          (item->>'url') = 'https://tagex.app/ads/iam-tag-init-may-2026.jpg'
          OR (item->>'alt') ILIKE '%Tag-Init%aMAYzing%'
        )
      ), '[]'::jsonb)
    ) AS new_banner
  FROM public.cards c
  WHERE c.ad_banner ? 'items'
    AND c.ad_banner::text ILIKE '%iam-tag-init-may-2026%'
)
UPDATE public.cards c
SET ad_banner = CASE
  WHEN jsonb_array_length(f.new_banner->'items') = 0 THEN NULL
  ELSE f.new_banner
END
FROM filtered f
WHERE c.id = f.id;
