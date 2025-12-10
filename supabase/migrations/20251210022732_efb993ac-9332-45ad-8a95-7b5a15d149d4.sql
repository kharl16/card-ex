-- Add RLS policies for cardex-products storage bucket

-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload product images to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cardex-products' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own product images
CREATE POLICY "Users can update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cardex-products' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'cardex-products' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own product images  
CREATE POLICY "Users can delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cardex-products' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to product images (bucket is already public, but policy ensures it)
CREATE POLICY "Public read access to product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'cardex-products');