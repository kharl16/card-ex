DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;
CREATE POLICY "Public can view active companies" ON public.companies
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view brochure sections" ON public.global_brochure_sections;
CREATE POLICY "Public can view sections of active brochures" ON public.global_brochure_sections
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.global_brochures b WHERE b.id = brochure_id AND b.is_active = true)
  );