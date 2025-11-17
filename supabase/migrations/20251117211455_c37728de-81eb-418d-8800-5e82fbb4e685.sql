-- Create product_images table for 3D carousel feature
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  owner UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Public can view all product images (for published cards)
CREATE POLICY "read_public_images"
ON public.product_images
FOR SELECT
TO anon, authenticated
USING (true);

-- Card owners can manage their product images
CREATE POLICY "owner_insert_images"
ON public.product_images
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner 
  AND card_id IN (
    SELECT id FROM public.cards 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "owner_update_images"
ON public.product_images
FOR UPDATE
TO authenticated
USING (auth.uid() = owner)
WITH CHECK (auth.uid() = owner);

CREATE POLICY "owner_delete_images"
ON public.product_images
FOR DELETE
TO authenticated
USING (auth.uid() = owner);

-- Create index for faster queries
CREATE INDEX idx_product_images_card_id ON public.product_images(card_id);
CREATE INDEX idx_product_images_sort_order ON public.product_images(card_id, sort_order);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cardex-products',
  'cardex-products',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'cardex-products');

CREATE POLICY "Card owners can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cardex-products'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Card owners can update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cardex-products'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Card owners can delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cardex-products'
  AND auth.uid()::text = (storage.foldername(name))[1]
);