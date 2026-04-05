
-- Temporarily allow public upload to media bucket for shared folder
CREATE POLICY "Allow public upload to shared folder"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'shared');
