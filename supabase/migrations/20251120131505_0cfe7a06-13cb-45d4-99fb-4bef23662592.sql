-- Add RLS policies to app_settings table for admin-only access

-- Admin read access
CREATE POLICY "Admin read app settings"
ON public.app_settings FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Admin write access (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin manage app settings"
ON public.app_settings FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Add comment for documentation
COMMENT ON TABLE public.app_settings IS 'Application configuration settings. Access restricted to super admins only.';