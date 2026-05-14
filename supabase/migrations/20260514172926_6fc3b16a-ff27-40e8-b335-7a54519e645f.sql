ALTER TABLE public.global_product_images ADD COLUMN IF NOT EXISTS srp text;
ALTER TABLE public.global_package_images ADD COLUMN IF NOT EXISTS srp text;