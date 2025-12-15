-- Migrate existing social links from card_links table to cards.social_links JSON field
UPDATE public.cards c
SET social_links = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'kind', cl.kind,
        'label', cl.label,
        'url', cl.value
      )
      ORDER BY cl.sort_index
    ),
    '[]'::jsonb
  )
  FROM public.card_links cl
  WHERE cl.card_id = c.id
    AND cl.kind IN ('facebook', 'instagram', 'tiktok', 'x', 'youtube', 'linkedin', 'whatsapp', 'messenger', 'telegram', 'viber')
)
WHERE c.social_links IS NULL OR c.social_links = '[]'::jsonb;