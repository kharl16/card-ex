ALTER TABLE public.global_brochures
ADD COLUMN page_shape text NOT NULL DEFAULT 'portrait';

ALTER TABLE public.global_brochures
ADD CONSTRAINT global_brochures_page_shape_valid
CHECK (page_shape IN ('portrait', 'landscape', 'original'));

COMMENT ON COLUMN public.global_brochures.page_shape IS
'Default brochure page presentation: portrait, landscape, or original.';