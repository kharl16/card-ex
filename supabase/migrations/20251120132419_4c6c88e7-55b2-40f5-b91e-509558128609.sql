-- Create card-images storage bucket only (policies already exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-images',
  'card-images',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);