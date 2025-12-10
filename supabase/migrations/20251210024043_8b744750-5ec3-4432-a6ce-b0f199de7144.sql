-- Update storage policies for cardex-products bucket to allow admin override

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload product images to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their product images" ON storage.objects;

-- Recreate with admin override

-- Allow authenticated users to upload images to their own folder OR admins can upload anywhere
CREATE POLICY "Users can upload product images to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cardex-products' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_super_admin(auth.uid())
  )
);

-- Allow users to update their own product images OR admins can update any
CREATE POLICY "Users can update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cardex-products' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'cardex-products' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_super_admin(auth.uid())
  )
);

-- Allow users to delete their own product images OR admins can delete any
CREATE POLICY "Users can delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cardex-products' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_super_admin(auth.uid())
  )
);