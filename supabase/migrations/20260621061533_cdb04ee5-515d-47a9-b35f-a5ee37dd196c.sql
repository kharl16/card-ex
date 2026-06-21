
-- Remove 2025 Q4 Incentive files and their favorites
DELETE FROM public.resource_favorites WHERE resource_type='file' AND resource_id IN ('110','111','112');
DELETE FROM public.files_repository WHERE id IN (110,111,112);

-- Rename "Files" to "Resources" in global tools orb settings
UPDATE public.tools_orb_settings
SET items = (
  SELECT jsonb_agg(
    CASE WHEN item->>'id' = 'files' THEN jsonb_set(item, '{label}', '"Resources"'::jsonb) ELSE item END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items::text ILIKE '%"id": "files"%' OR items::text ILIKE '%"id":"files"%';

-- Rename "Files" to "Resources" in per-user overrides
UPDATE public.user_orb_overrides
SET items = (
  SELECT jsonb_agg(
    CASE WHEN item->>'id' = 'files' AND item->>'label' = 'Files'
         THEN jsonb_set(item, '{label}', '"Resources"'::jsonb)
         ELSE item END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items::text ILIKE '%"label":"Files"%' OR items::text ILIKE '%"label": "Files"%';
