-- 1. Drop anon-facing public read policies on vault tables
DROP POLICY IF EXISTS "Public can view active public links" ON public.iam_links;
DROP POLICY IF EXISTS "Public can view active public directory" ON public.directory_entries;
DROP POLICY IF EXISTS "Public can view active public ambassadors" ON public.ambassadors_library;
DROP POLICY IF EXISTS "Public can view active training items" ON public.training_items;

-- 2. Tools orb settings: authenticated-only read
DROP POLICY IF EXISTS "Anyone can read tools_orb_settings" ON public.tools_orb_settings;
CREATE POLICY "Authenticated can read tools_orb_settings"
  ON public.tools_orb_settings FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 3. Revoke anon table-level access on all Tools Vault tables (defence in depth)
REVOKE ALL ON public.iam_links FROM anon;
REVOKE ALL ON public.directory_entries FROM anon;
REVOKE ALL ON public.ambassadors_library FROM anon;
REVOKE ALL ON public.training_items FROM anon;
REVOKE ALL ON public.training_folders FROM anon;
REVOKE ALL ON public.files_repository FROM anon;
REVOKE ALL ON public.tools FROM anon;
REVOKE ALL ON public.tools_orb_settings FROM anon;
REVOKE ALL ON public.presentations FROM anon;
REVOKE ALL ON public.resource_folders FROM anon;
REVOKE ALL ON public.resource_favorites FROM anon;
REVOKE ALL ON public.ways_13 FROM anon;
REVOKE ALL ON public.user_orb_overrides FROM anon;
REVOKE ALL ON public."IAM Files" FROM anon;

-- 4. Ensure authenticated + service_role retain required access
GRANT SELECT ON public.iam_links, public.directory_entries, public.ambassadors_library,
  public.training_items, public.training_folders, public.files_repository, public.tools,
  public.tools_orb_settings, public.presentations, public.resource_folders,
  public.ways_13, public."IAM Files" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_favorites, public.user_orb_overrides TO authenticated;
GRANT ALL ON public.iam_links, public.directory_entries, public.ambassadors_library,
  public.training_items, public.training_folders, public.files_repository, public.tools,
  public.tools_orb_settings, public.presentations, public.resource_folders,
  public.resource_favorites, public.ways_13, public.user_orb_overrides, public."IAM Files" TO service_role;

-- 5. Card/user-scoped vault personalization: strict owner-or-admin enforcement
DROP POLICY IF EXISTS "Users can manage own orb overrides" ON public.user_orb_overrides;
CREATE POLICY "Owner or admin can manage orb overrides"
  ON public.user_orb_overrides FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_super_admin(auth.uid())))
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_super_admin(auth.uid())));