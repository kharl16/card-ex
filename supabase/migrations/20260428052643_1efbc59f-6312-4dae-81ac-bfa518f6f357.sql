
-- 1) Create a public-safe view of cards that excludes internal/sensitive columns.
--    Excludes: payment internals (is_paid, paid_at, paid_overridden_by_admin, plan_id),
--    referral chain attribution (owner_referral_code, referred_by_code, referred_by_name, referred_by_user_id),
--    personality assessment results (disc_result, mindset_result, love_language_result),
--    and design-patch internals (design_version, last_design_patch_id).
--    Public profile fields (name, title, company, bio, contact, socials, images, theme) remain visible
--    as is intentional for published business cards.

DROP VIEW IF EXISTS public.cards_public;

CREATE VIEW public.cards_public
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  organization_id,
  slug,
  custom_slug,
  full_name,
  prefix,
  first_name,
  middle_name,
  last_name,
  suffix,
  owner_name,
  title,
  company,
  bio,
  phone,
  email,
  website,
  location,
  avatar_url,
  cover_url,
  logo_url,
  theme,
  qr_code_url,
  vcard_url,
  wallet_pass_url,
  share_url,
  public_url,
  social_links,
  product_images,
  package_images,
  testimony_images,
  carousel_settings,
  carousel_enabled,
  video_items,
  ad_banner,
  card_type,
  is_published,
  published_at,
  created_at,
  updated_at
FROM public.cards
WHERE is_published = true;

-- Grant read access to the view for anon and authenticated roles.
GRANT SELECT ON public.cards_public TO anon, authenticated;

-- 2) Tighten the public SELECT policy on cards: remove anonymous access entirely.
--    Owners, org admins, and super admins keep full access. Anonymous public reads
--    must now go through the cards_public view (which exposes only safe columns).

DROP POLICY IF EXISTS "Anyone can view published cards" ON public.cards;

CREATE POLICY "Owners and org members can view their cards"
ON public.cards
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR organization_id IN (
    SELECT memberships.organization_id
    FROM memberships
    WHERE memberships.user_id = auth.uid()
      AND memberships.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])
  )
  OR is_super_admin(auth.uid())
);
