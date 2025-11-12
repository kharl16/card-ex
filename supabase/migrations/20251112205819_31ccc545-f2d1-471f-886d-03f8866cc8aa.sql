-- Ensure RLS policies for media bucket uploads
-- Allow authenticated users to upload their own card images
CREATE POLICY "Users can upload card images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own uploaded images
CREATE POLICY "Users can view their own card images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view images from published cards
CREATE POLICY "Anyone can view media from published cards"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media');

-- Allow users to update their own images
CREATE POLICY "Users can update their own card images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own card images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);