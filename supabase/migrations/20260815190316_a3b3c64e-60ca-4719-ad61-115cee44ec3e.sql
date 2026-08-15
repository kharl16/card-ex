-- 1. availability_settings: no more blanket public read
DROP POLICY IF EXISTS "Anyone can view availability settings" ON public.availability_settings;
CREATE POLICY "Booking context can view availability settings"
ON public.availability_settings
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.user_id = availability_settings.user_id
      AND c.is_published = true
  )
);

-- 2. IAM Files: align with the resource visibility pattern
DROP POLICY IF EXISTS "Authenticated can view IAM Files" ON public."IAM Files";
CREATE POLICY "Members can view IAM Files"
ON public."IAM Files"
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.can_view_resource(auth.uid(), 'public_members'::visibility_level, NULL)
);

-- 3. system_settings: admins only
DROP POLICY IF EXISTS "Authenticated can read settings" ON public.system_settings;
CREATE POLICY "Admins can read settings"
ON public.system_settings
FOR SELECT
USING (public.is_resource_admin(auth.uid()));

-- 4. Storage: remove unscoped INSERT policies, enforce folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload qrcodes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vcards" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to media" ON storage.objects;
CREATE POLICY "Users can upload media to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','gif','webp'])
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_resource_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload to qrcodes" ON storage.objects;
CREATE POLICY "Users can upload qrcodes to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'qrcodes'
  AND lower(storage.extension(name)) = ANY (ARRAY['png','svg','jpg','jpeg'])
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_resource_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload to vcards" ON storage.objects;
CREATE POLICY "Users can upload vcards for own cards"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vcards'
  AND lower(storage.extension(name)) = ANY (ARRAY['vcf','vcard'])
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_resource_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.user_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[2]
    )
  )
);
