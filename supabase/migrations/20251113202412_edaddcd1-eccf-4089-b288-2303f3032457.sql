-- A) SUPER ADMIN: Add is_super_admin column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- B) SHARE LINKS: Create share_links table
CREATE TABLE IF NOT EXISTS public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  label text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for share_links
CREATE INDEX IF NOT EXISTS idx_share_links_card_id ON public.share_links(card_id);
CREATE INDEX IF NOT EXISTS idx_share_links_card_active ON public.share_links(card_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_share_links_code ON public.share_links(code);

-- Add optional share_code column to card_events for analytics
ALTER TABLE public.card_events ADD COLUMN IF NOT EXISTS share_code text;
CREATE INDEX IF NOT EXISTS idx_card_events_share_code ON public.card_events(share_code) WHERE share_code IS NOT NULL;

-- Enable RLS on share_links
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- ============================================
-- UPDATE RLS POLICIES FOR SUPER ADMIN ACCESS
-- ============================================

-- PROFILES: Allow super admin to view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
  );

-- CARDS: Super admin can view all cards
DROP POLICY IF EXISTS "Anyone can view published cards" ON public.cards;
CREATE POLICY "Anyone can view published cards" ON public.cards
  FOR SELECT USING (
    is_published = true 
    OR user_id = auth.uid() 
    OR (organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND role = ANY(ARRAY['owner'::app_role, 'admin'::app_role])))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- CARDS: Super admin can update all cards
DROP POLICY IF EXISTS "Owners and org admins can update cards" ON public.cards;
CREATE POLICY "Owners and org admins can update cards" ON public.cards
  FOR UPDATE USING (
    user_id = auth.uid() 
    OR (organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND role = ANY(ARRAY['owner'::app_role, 'admin'::app_role])))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- CARDS: Super admin can delete all cards
DROP POLICY IF EXISTS "Users can delete their own cards" ON public.cards;
CREATE POLICY "Users can delete their own cards" ON public.cards
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- CARD_LINKS: Super admin can manage all links
DROP POLICY IF EXISTS "Card owners can manage links" ON public.card_links;
CREATE POLICY "Card owners can manage links" ON public.card_links
  FOR ALL USING (
    (card_id IN (SELECT id FROM cards WHERE user_id = auth.uid()))
    OR (card_id IN (SELECT id FROM cards WHERE organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND role = ANY(ARRAY['owner'::app_role, 'admin'::app_role]))))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- CARD_EVENTS: Super admin can view all events
DROP POLICY IF EXISTS "Card owners can view events" ON public.card_events;
CREATE POLICY "Card owners can view events" ON public.card_events
  FOR SELECT USING (
    (card_id IN (SELECT id FROM cards WHERE user_id = auth.uid()))
    OR (card_id IN (SELECT id FROM cards WHERE organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ANALYTICS_DAILY: Super admin can view all analytics
DROP POLICY IF EXISTS "Card owners can view analytics" ON public.analytics_daily;
CREATE POLICY "Card owners can view analytics" ON public.analytics_daily
  FOR SELECT USING (
    (card_id IN (SELECT id FROM cards WHERE user_id = auth.uid()))
    OR (card_id IN (SELECT id FROM cards WHERE organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ORGANIZATIONS: Super admin can view all orgs
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
  FOR SELECT USING (
    (id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ORGANIZATIONS: Super admin can update all orgs
DROP POLICY IF EXISTS "Owners and admins can update organizations" ON public.organizations;
CREATE POLICY "Owners and admins can update organizations" ON public.organizations
  FOR UPDATE USING (
    (id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND role = ANY(ARRAY['owner'::app_role, 'admin'::app_role])))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- MEMBERSHIPS: Super admin can view all memberships
DROP POLICY IF EXISTS "Members can view their own memberships" ON public.memberships;
CREATE POLICY "Members can view their own memberships" ON public.memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
  );

-- ====================================
-- RLS POLICIES FOR SHARE_LINKS
-- ====================================

-- Card owners, org admins, and super admin can manage share links
CREATE POLICY "share_links_manage" ON public.share_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.cards c 
      WHERE c.id = share_links.card_id 
        AND (
          c.user_id = auth.uid() 
          OR (c.organization_id IS NOT NULL 
              AND EXISTS (
                SELECT 1 FROM public.memberships m 
                WHERE m.organization_id = c.organization_id 
                  AND m.user_id = auth.uid() 
                  AND m.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
              )
          )
        )
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
  ) WITH CHECK (true);

-- Public can read active share links by code
CREATE POLICY "share_links_public_read" ON public.share_links
  FOR SELECT USING (is_active = true);