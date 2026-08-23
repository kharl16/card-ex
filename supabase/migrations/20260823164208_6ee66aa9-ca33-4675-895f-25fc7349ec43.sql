ALTER TABLE public.global_product_images ADD COLUMN IF NOT EXISTS url_2 text;
ALTER TABLE public.global_package_images ADD COLUMN IF NOT EXISTS url_2 text;