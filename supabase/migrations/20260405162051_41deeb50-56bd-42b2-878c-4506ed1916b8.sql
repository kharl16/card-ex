
-- Remove the temporary upload policy
DROP POLICY IF EXISTS "Allow public upload to shared folder" ON storage.objects;

-- Update logo_url for all cards except excluded ones
UPDATE cards
SET logo_url = 'https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/media/shared/iam-worldwide-logo.png'
WHERE id NOT IN (
  '8bf1af4d-61a6-4196-9ce4-f58de7f75b33',
  '7273f74a-aaf1-494c-ad99-07350402cc2c'
);
