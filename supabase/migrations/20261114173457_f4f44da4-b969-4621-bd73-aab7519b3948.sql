-- tools: members only see active tools of their own company
DROP POLICY IF EXISTS "Authenticated users can view active tools" ON public.tools;
CREATE POLICY "Members view active tools of their company"
ON public.tools FOR SELECT TO authenticated
USING (is_active = true AND company_id = public.current_user_company_id());

-- tools_orb_settings: members only see their own company's settings
DROP POLICY IF EXISTS "Authenticated can read tools_orb_settings" ON public.tools_orb_settings;
CREATE POLICY "Members read their company tools_orb_settings"
ON public.tools_orb_settings FOR SELECT TO authenticated
USING (company_id = public.current_user_company_id());

-- sites: only admins (who manage directory/roles) can read the site list
DROP POLICY IF EXISTS "Authenticated can view sites" ON public.sites;
CREATE POLICY "Admins view active sites"
ON public.sites FOR SELECT TO authenticated
USING (is_active = true AND (public.is_resource_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)));

-- gcash_payment_settings: card owners see details only while GCash is switched on; super admins always
DROP POLICY IF EXISTS "Signed-in members read GCash details" ON public.gcash_payment_settings;
CREATE POLICY "Card owners read enabled GCash details"
ON public.gcash_payment_settings FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (enabled = true AND EXISTS (SELECT 1 FROM public.cards c WHERE c.user_id = auth.uid()))
);