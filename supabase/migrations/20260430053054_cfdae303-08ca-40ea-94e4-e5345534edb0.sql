-- Reset hide-overrides so every card (including Maria Grace Mulato) shows all
-- global product and package images by default. Owners can re-hide individually.
DELETE FROM public.card_global_image_overrides;
DELETE FROM public.card_global_package_overrides;