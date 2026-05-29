UPDATE public.global_testimony_images
SET caption = initcap(caption)
WHERE caption IS NOT NULL AND caption <> '';
