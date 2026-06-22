
-- 1) Recreate cards_public with security_invoker so RLS of querying user applies
DROP VIEW IF EXISTS public.cards_public;
CREATE VIEW public.cards_public
WITH (security_invoker=true) AS
SELECT id, user_id, organization_id, slug, custom_slug, full_name, prefix, first_name,
       middle_name, last_name, suffix, owner_name, title, company, bio, phone, email,
       website, location, avatar_url, cover_url, logo_url, theme, qr_code_url, vcard_url,
       wallet_pass_url, share_url, public_url, social_links, product_images, package_images,
       testimony_images, carousel_settings, carousel_enabled, video_items, ad_banner,
       image_carousels, show_daily_quote, card_type, is_published, published_at,
       created_at, updated_at
FROM public.cards
WHERE is_published = true;

GRANT SELECT ON public.cards_public TO anon, authenticated;

-- 2) Add explicit deny INSERT policy on card_events (service role bypasses RLS)
DROP POLICY IF EXISTS "Deny client inserts on card_events" ON public.card_events;
CREATE POLICY "Deny client inserts on card_events"
  ON public.card_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- 3) Replace hardcoded-email super admin check with role-based check
CREATE OR REPLACE FUNCTION public.is_kharl_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
$$;

-- 4) Tighten notifications INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert their own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5) Enforce visibility level on presentations SELECT
DROP POLICY IF EXISTS "Authenticated can view active presentations" ON public.presentations;
CREATE POLICY "Authenticated can view active presentations"
  ON public.presentations
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.can_view_resource(auth.uid(), visibility_level::visibility_level)
  );
