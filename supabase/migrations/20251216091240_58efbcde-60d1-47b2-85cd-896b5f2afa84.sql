-- Drop old unrestricted policy if it exists
DROP POLICY IF EXISTS "read card images" ON public.card_images;

-- Ensure the proper policy exists
DROP POLICY IF EXISTS "read card images for published cards or owner" ON public.card_images;

CREATE POLICY "read card images for published cards or owner"
ON public.card_images
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cards c 
    WHERE c.id = card_images.card_id 
    AND (c.is_published = true OR c.user_id = auth.uid())
  ) OR is_super_admin(auth.uid())
);