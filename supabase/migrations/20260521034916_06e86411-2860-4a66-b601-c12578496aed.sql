
CREATE TABLE public.global_testimony_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption text,
  sort_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.global_testimony_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active global testimony images"
ON public.global_testimony_images
FOR SELECT
USING ((is_active = true) OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage global testimony images"
ON public.global_testimony_images
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER update_global_testimony_images_updated_at
BEFORE UPDATE ON public.global_testimony_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
