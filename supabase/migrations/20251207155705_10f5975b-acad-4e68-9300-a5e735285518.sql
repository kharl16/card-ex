-- Fix RLS policy for product_images to allow admins to insert images for other users
-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "owner_insert_images" ON public.product_images;

-- Create a new INSERT policy that allows:
-- 1. Users to insert images for their own cards
-- 2. Super admins to insert images for any card (for cross-user duplication)
CREATE POLICY "owner_or_admin_insert_images" 
ON public.product_images 
FOR INSERT 
WITH CHECK (
  (auth.uid() = owner AND card_id IN (SELECT id FROM cards WHERE user_id = auth.uid()))
  OR is_super_admin(auth.uid())
);

-- Also update the DELETE policy to allow admins
DROP POLICY IF EXISTS "owner_delete_images" ON public.product_images;

CREATE POLICY "owner_or_admin_delete_images" 
ON public.product_images 
FOR DELETE 
USING (auth.uid() = owner OR is_super_admin(auth.uid()));

-- Also update the UPDATE policy to allow admins
DROP POLICY IF EXISTS "owner_update_images" ON public.product_images;

CREATE POLICY "owner_or_admin_update_images" 
ON public.product_images 
FOR UPDATE 
USING (auth.uid() = owner OR is_super_admin(auth.uid()))
WITH CHECK (auth.uid() = owner OR is_super_admin(auth.uid()));