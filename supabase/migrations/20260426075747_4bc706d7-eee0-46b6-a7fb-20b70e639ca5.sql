-- Add flexible custom fields + caption to resource tables
ALTER TABLE public.files_repository
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.ambassadors_library
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.iam_links
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.directory_entries
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Storage bucket for resource files (public so Drive-link-style download URLs work)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, resource admins manage
DROP POLICY IF EXISTS "Public read resources bucket" ON storage.objects;
CREATE POLICY "Public read resources bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resources');

DROP POLICY IF EXISTS "Resource admins upload resources" ON storage.objects;
CREATE POLICY "Resource admins upload resources"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resources' AND public.is_resource_admin(auth.uid()));

DROP POLICY IF EXISTS "Resource admins update resources" ON storage.objects;
CREATE POLICY "Resource admins update resources"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'resources' AND public.is_resource_admin(auth.uid()));

DROP POLICY IF EXISTS "Resource admins delete resources" ON storage.objects;
CREATE POLICY "Resource admins delete resources"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resources' AND public.is_resource_admin(auth.uid()));