-- Drop the view as the RLS policy change is sufficient
-- The view was flagged as SECURITY DEFINER which is a security concern
DROP VIEW IF EXISTS public.product_images_public;