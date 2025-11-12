-- Add storage policies to restrict uploads and prevent abuse

-- Media bucket policies: Only authenticated users can upload images
CREATE POLICY "Authenticated users can upload to media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  auth.uid() IS NOT NULL AND
  (LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp'))
);

CREATE POLICY "Users can delete their own media files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' AND
  owner = auth.uid()
);

CREATE POLICY "Anyone can view media files"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- QR codes bucket policies: Only authenticated users can upload images
CREATE POLICY "Authenticated users can upload to qrcodes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'qrcodes' AND
  auth.uid() IS NOT NULL AND
  (LOWER(storage.extension(name)) IN ('png', 'svg', 'jpg', 'jpeg'))
);

CREATE POLICY "Users can delete their own qrcode files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'qrcodes' AND
  owner = auth.uid()
);

CREATE POLICY "Anyone can view qrcode files"
ON storage.objects FOR SELECT
USING (bucket_id = 'qrcodes');

-- VCards bucket policies: Only authenticated users can upload vcards
CREATE POLICY "Authenticated users can upload to vcards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vcards' AND
  auth.uid() IS NOT NULL AND
  (LOWER(storage.extension(name)) IN ('vcf', 'vcard'))
);

CREATE POLICY "Users can delete their own vcard files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vcards' AND
  owner = auth.uid()
);

CREATE POLICY "Anyone can view vcard files"
ON storage.objects FOR SELECT
USING (bucket_id = 'vcards');

-- Set file size limits (10MB for media, 5MB for qrcodes, 1MB for vcards)
UPDATE storage.buckets 
SET file_size_limit = 10485760  -- 10MB
WHERE name = 'media';

UPDATE storage.buckets 
SET file_size_limit = 5242880  -- 5MB
WHERE name = 'qrcodes';

UPDATE storage.buckets 
SET file_size_limit = 1048576  -- 1MB
WHERE name = 'vcards';

-- Set allowed MIME types for each bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp'
]
WHERE name = 'media';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/svg+xml',
  'image/jpeg'
]
WHERE name = 'qrcodes';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'text/vcard',
  'text/x-vcard',
  'text/directory'
]
WHERE name = 'vcards';