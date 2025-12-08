-- Create a public view that excludes the owner field
CREATE VIEW public.product_images_public AS
SELECT 
  id,
  card_id,
  image_url,
  alt_text,
  description,
  sort_order,
  created_at
FROM public.product_images;

-- Grant access to the view
GRANT SELECT ON public.product_images_public TO anon, authenticated;

-- Update the RLS policy on product_images to restrict public reads
-- First drop the existing overly permissive policy
DROP POLICY IF EXISTS "read_public_images" ON public.product_images;

-- Create a new policy that only allows reading images for published cards
-- or if the user owns the image
CREATE POLICY "read_images_for_published_cards_or_owner" 
ON public.product_images 
FOR SELECT 
USING (
  (auth.uid() = owner) OR 
  is_super_admin(auth.uid()) OR
  (card_id IN (SELECT id FROM public.cards WHERE is_published = true))
);