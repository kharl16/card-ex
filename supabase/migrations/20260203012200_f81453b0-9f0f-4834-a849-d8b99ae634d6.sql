-- Add owner photo and location image columns to directory_entries
ALTER TABLE public.directory_entries
ADD COLUMN owner_photo_url text,
ADD COLUMN location_image_url text;