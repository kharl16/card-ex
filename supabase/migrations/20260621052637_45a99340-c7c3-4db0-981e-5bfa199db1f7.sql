
-- Fix the broken integer id sequence on files_repository (CSV imports left it behind)
SELECT setval('public.files_repository_id_seq', COALESCE((SELECT MAX(id) FROM public.files_repository), 1), true);

-- Helper: identify the single super-admin user by email
CREATE OR REPLACE FUNCTION public.is_kharl_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) = 'kharl16@gmail.com'
  )
$$;

-- Restrict write access on Resources tables to ONLY kharl16@gmail.com
DROP POLICY IF EXISTS "Admins can manage files" ON public.files_repository;
CREATE POLICY "Only super admin can manage files"
  ON public.files_repository FOR ALL
  TO authenticated
  USING (public.is_kharl_super_admin(auth.uid()))
  WITH CHECK (public.is_kharl_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage ambassadors" ON public.ambassadors_library;
CREATE POLICY "Only super admin can manage ambassadors"
  ON public.ambassadors_library FOR ALL
  TO authenticated
  USING (public.is_kharl_super_admin(auth.uid()))
  WITH CHECK (public.is_kharl_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage links" ON public.iam_links;
CREATE POLICY "Only super admin can manage links"
  ON public.iam_links FOR ALL
  TO authenticated
  USING (public.is_kharl_super_admin(auth.uid()))
  WITH CHECK (public.is_kharl_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage directory" ON public.directory_entries;
CREATE POLICY "Only super admin can manage directory"
  ON public.directory_entries FOR ALL
  TO authenticated
  USING (public.is_kharl_super_admin(auth.uid()))
  WITH CHECK (public.is_kharl_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage ways" ON public.ways_13;
CREATE POLICY "Only super admin can manage ways"
  ON public.ways_13 FOR ALL
  TO authenticated
  USING (public.is_kharl_super_admin(auth.uid()))
  WITH CHECK (public.is_kharl_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage folders" ON public.resource_folders;
CREATE POLICY "Only super admin can manage folders"
  ON public.resource_folders FOR ALL
  TO authenticated
  USING (public.is_kharl_super_admin(auth.uid()))
  WITH CHECK (public.is_kharl_super_admin(auth.uid()));
