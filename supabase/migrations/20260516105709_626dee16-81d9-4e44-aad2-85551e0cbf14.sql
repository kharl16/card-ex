UPDATE public.cards
SET theme = jsonb_set(
  jsonb_set(
    COALESCE(theme, '{}'::jsonb),
    '{avatarDisplayMode}', '"contain"'::jsonb, true
  ),
  '{logoDisplayMode}', '"contain"'::jsonb, true
);

UPDATE public.cards
SET theme = jsonb_set(
  jsonb_set(theme, '{variants,A,avatarDisplayMode}', '"contain"'::jsonb, false),
  '{variants,A,logoDisplayMode}', '"contain"'::jsonb, false
)
WHERE theme #> '{variants,A}' IS NOT NULL;

UPDATE public.cards
SET theme = jsonb_set(
  jsonb_set(theme, '{variants,B,avatarDisplayMode}', '"contain"'::jsonb, false),
  '{variants,B,logoDisplayMode}', '"contain"'::jsonb, false
)
WHERE theme #> '{variants,B}' IS NOT NULL;
