CREATE TABLE public.global_cover_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text,
  sort_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.global_cover_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_cover_photos TO authenticated;
GRANT ALL ON public.global_cover_photos TO service_role;
ALTER TABLE public.global_cover_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active global cover photos" ON public.global_cover_photos FOR SELECT
  USING (is_active = true OR public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage global cover photos" ON public.global_cover_photos FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER update_global_cover_photos_updated_at
  BEFORE UPDATE ON public.global_cover_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE POLICY "Super admins upload global cover photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'global-cover-photos'
    AND public.is_super_admin(auth.uid())
  );