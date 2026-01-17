-- Add public access policy for iam_links
-- Allows unauthenticated users to view active, public-visible links
CREATE POLICY "Public can view active public links"
ON public.iam_links
FOR SELECT
USING (
  is_active = true 
  AND visibility_level = 'public_members'
);

-- Add public access policy for directory_entries
-- Allows unauthenticated users to view active, public-visible directory entries
CREATE POLICY "Public can view active public directory"
ON public.directory_entries
FOR SELECT
USING (
  is_active = true 
  AND visibility_level = 'public_members'
);