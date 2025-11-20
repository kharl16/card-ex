-- Fix admin role security vulnerability by migrating RLS policies from profiles.is_super_admin column to is_super_admin() function

-- ============================================================================
-- ANALYTICS_DAILY
-- ============================================================================
DROP POLICY IF EXISTS "Card owners can view analytics" ON public.analytics_daily;
CREATE POLICY "Card owners can view analytics" 
ON public.analytics_daily
FOR SELECT 
USING (
  (card_id IN (SELECT id FROM cards WHERE user_id = auth.uid()))
  OR (card_id IN (SELECT id FROM cards WHERE organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid()
  )))
  OR is_super_admin(auth.uid())
);

-- ============================================================================
-- CARD_LINKS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view links for published cards" ON public.card_links;
CREATE POLICY "Anyone can view links for published cards" 
ON public.card_links
FOR SELECT 
USING (
  (card_id IN (SELECT id FROM cards WHERE is_published = true))
  OR (card_id IN (SELECT id FROM cards WHERE user_id = auth.uid()))
  OR (card_id IN (SELECT id FROM cards WHERE organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid()
  )))
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Card owners can manage links" ON public.card_links;
CREATE POLICY "Card owners can manage links" 
ON public.card_links
FOR ALL 
USING (
  (card_id IN (SELECT id FROM cards WHERE user_id = auth.uid()))
  OR (card_id IN (SELECT id FROM cards WHERE organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )))
  OR is_super_admin(auth.uid())
);

-- ============================================================================
-- CARDS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view published cards" ON public.cards;
CREATE POLICY "Anyone can view published cards" 
ON public.cards
FOR SELECT 
USING (
  is_published = true
  OR user_id = auth.uid()
  OR (organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ))
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners and org admins can update cards" ON public.cards;
CREATE POLICY "Owners and org admins can update cards" 
ON public.cards
FOR UPDATE 
USING (
  user_id = auth.uid()
  OR (organization_id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ))
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their own cards" ON public.cards;
CREATE POLICY "Users can delete their own cards" 
ON public.cards
FOR DELETE 
USING (
  user_id = auth.uid()
  OR is_super_admin(auth.uid())
);

-- ============================================================================
-- MEMBERSHIPS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view their own memberships" ON public.memberships;
CREATE POLICY "Members can view their own memberships" 
ON public.memberships
FOR SELECT 
USING (
  user_id = auth.uid()
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/admins can delete memberships" ON public.memberships;
CREATE POLICY "Owners/admins can delete memberships" 
ON public.memberships
FOR DELETE 
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/admins can insert memberships" ON public.memberships;
CREATE POLICY "Owners/admins can insert memberships" 
ON public.memberships
FOR INSERT 
WITH CHECK (
  is_org_admin(auth.uid(), organization_id)
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/admins can update memberships" ON public.memberships;
CREATE POLICY "Owners/admins can update memberships" 
ON public.memberships
FOR UPDATE 
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_super_admin(auth.uid())
)
WITH CHECK (
  is_org_admin(auth.uid(), organization_id)
  OR is_super_admin(auth.uid())
);

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" 
ON public.organizations
FOR SELECT 
USING (
  id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())
  OR created_by = auth.uid()
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners and admins can update organizations" ON public.organizations;
CREATE POLICY "Owners and admins can update organizations" 
ON public.organizations
FOR UPDATE 
USING (
  id IN (
    SELECT organization_id FROM memberships 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR is_super_admin(auth.uid())
);

-- ============================================================================
-- PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles
FOR SELECT 
USING (
  auth.uid() = id
  OR is_super_admin(auth.uid())
);

-- ============================================================================
-- SHARE_LINKS
-- ============================================================================
DROP POLICY IF EXISTS "share_links_manage" ON public.share_links;
CREATE POLICY "share_links_manage" 
ON public.share_links
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM cards c
    WHERE c.id = share_links.card_id
    AND (
      c.user_id = auth.uid()
      OR (
        c.organization_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.organization_id = c.organization_id
          AND m.user_id = auth.uid()
          AND m.role IN ('admin', 'owner')
        )
      )
    )
  )
  OR is_super_admin(auth.uid())
)
WITH CHECK (true);

-- ============================================================================
-- Remove is_super_admin column from profiles table
-- ============================================================================
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_super_admin;