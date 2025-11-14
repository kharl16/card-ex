-- Add UPDATE policy for qrcodes bucket to allow QR code regeneration
DROP POLICY IF EXISTS "Users can update their own qrcode files" ON storage.objects;

CREATE POLICY "Users can update their own qrcode files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'qrcodes' AND
  owner = auth.uid()
);