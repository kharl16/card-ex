ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS showcase_display_mode text NOT NULL DEFAULT 'carousel',
  ADD COLUMN IF NOT EXISTS brochure_images jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.cards
  DROP CONSTRAINT IF EXISTS cards_showcase_display_mode_check;

ALTER TABLE public.cards
  ADD CONSTRAINT cards_showcase_display_mode_check
  CHECK (showcase_display_mode IN ('carousel', 'immersive'));

CREATE OR REPLACE VIEW public.cards_public AS
SELECT id,
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
    image_carousels,
    show_daily_quote,
    card_type,
    is_published,
    published_at,
    created_at,
    updated_at,
    brochure_images,
    showcase_display_mode
   FROM public.cards
  WHERE is_published = true;