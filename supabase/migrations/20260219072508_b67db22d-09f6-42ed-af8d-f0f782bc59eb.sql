
-- Populate training_items from the Videos table (excluding Ambassador Clips which use ambassadors_library)
INSERT INTO public.training_items (title, description, thumbnail_url, video_url, source_type, category, is_active, sort_order)
SELECT 
  "Title",
  "Description",
  "Thumbnail Image",
  "Video File URL",
  CASE 
    WHEN "Video File URL" ILIKE '%youtube%' OR "Video File URL" ILIKE '%youtu.be%' THEN 'youtube'
    ELSE 'direct'
  END,
  "Folder Name",
  true,
  "ID"
FROM public."Videos"
WHERE "Folder Name" IS NOT NULL
  AND "Folder Name" != 'Ambassador Clips'
  AND "Title" IS NOT NULL;
