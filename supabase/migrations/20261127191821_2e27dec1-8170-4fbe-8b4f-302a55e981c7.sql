DROP POLICY "Anyone can view active global cover photos" ON public.global_cover_photos;
DROP POLICY "Super admins manage global cover photos" ON public.global_cover_photos;
CREATE POLICY "Public visitors view active global cover photos" ON public.global_cover_photos
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Signed-in users view global cover photos" ON public.global_cover_photos
  FOR SELECT TO authenticated USING (is_active = true OR public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins add global cover photos" ON public.global_cover_photos
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins edit global cover photos" ON public.global_cover_photos
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins remove global cover photos" ON public.global_cover_photos
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));