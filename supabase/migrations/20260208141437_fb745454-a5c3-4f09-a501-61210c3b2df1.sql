
-- Allow public (unauthenticated) access to active training folders with public visibility
CREATE POLICY "Public can view active public training folders"
ON public.training_folders FOR SELECT
USING (is_active = true AND visibility_level = 'public_members'::visibility_level);

-- Allow public access to active training items
CREATE POLICY "Public can view active training items"
ON public.training_items FOR SELECT
USING (is_active = true AND visibility_level = 'public_members');

-- Allow public access to active ambassador clips with public visibility
CREATE POLICY "Public can view active public ambassadors"
ON public.ambassadors_library FOR SELECT
USING (is_active = true AND visibility_level = 'public_members'::visibility_level);
