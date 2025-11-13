-- Fix infinite recursion by creating a security definer function
-- Drop the problematic function if it exists
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);

-- Create a security definer function to check super admin status
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Set kharl16@gmail.com as super admin
UPDATE public.profiles 
SET is_super_admin = true 
WHERE id = (SELECT id FROM auth.users WHERE email = 'kharl16@gmail.com' LIMIT 1);

-- Now fix all RLS policies to use the security definer function
-- PROFILES table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "read own or superadmin" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_super_admin(auth.uid())
  );

-- CARDS table
DROP POLICY IF EXISTS "Anyone can view published cards" ON public.cards;
CREATE POLICY "Anyone can view published cards" ON public.cards
  FOR SELECT USING (
    is_published = true 
    OR user_id = auth.uid() 
    OR organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Owners and org admins can update cards" ON public.cards;
CREATE POLICY "Owners and org admins can update cards" ON public.cards
  FOR UPDATE USING (
    user_id = auth.uid() 
    OR organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own cards" ON public.cards;
CREATE POLICY "Users can delete their own cards" ON public.cards
  FOR DELETE USING (
    user_id = auth.uid() OR public.is_super_admin(auth.uid())
  );

-- CARD_LINKS table
DROP POLICY IF EXISTS "Anyone can view links for published cards" ON public.card_links;
CREATE POLICY "Anyone can view links for published cards" ON public.card_links
  FOR SELECT USING (
    card_id IN (SELECT id FROM cards WHERE is_published = true)
    OR card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR card_id IN (
      SELECT id FROM cards WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Card owners can manage links" ON public.card_links;
CREATE POLICY "Card owners can manage links" ON public.card_links
  FOR ALL USING (
    card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR card_id IN (
      SELECT id FROM cards WHERE organization_id IN (
        SELECT organization_id FROM memberships 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
    OR public.is_super_admin(auth.uid())
  );

-- CARD_EVENTS table  
DROP POLICY IF EXISTS "Card owners can view events" ON public.card_events;
CREATE POLICY "Card owners can view events" ON public.card_events
  FOR SELECT USING (
    card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR card_id IN (
      SELECT id FROM cards WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
    OR public.is_super_admin(auth.uid())
  );

-- ANALYTICS_DAILY table
DROP POLICY IF EXISTS "Card owners can view analytics" ON public.analytics_daily;
CREATE POLICY "Card owners can view analytics" ON public.analytics_daily
  FOR SELECT USING (
    card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR card_id IN (
      SELECT id FROM cards WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
    OR public.is_super_admin(auth.uid())
  );

-- ORGANIZATIONS table
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())
    OR created_by = auth.uid()
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Owners and admins can update organizations" ON public.organizations;
CREATE POLICY "Owners and admins can update organizations" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- MEMBERSHIPS table
DROP POLICY IF EXISTS "Members can view their own memberships" ON public.memberships;
CREATE POLICY "Members can view their own memberships" ON public.memberships
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Owners/admins can insert memberships" ON public.memberships;
CREATE POLICY "Owners/admins can insert memberships" ON public.memberships
  FOR INSERT WITH CHECK (
    is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Owners/admins can update memberships" ON public.memberships;
CREATE POLICY "Owners/admins can update memberships" ON public.memberships
  FOR UPDATE USING (
    is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Owners/admins can delete memberships" ON public.memberships;
CREATE POLICY "Owners/admins can delete memberships" ON public.memberships
  FOR DELETE USING (
    is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid())
  );

-- SHARE_LINKS table
DROP POLICY IF EXISTS "share_links_manage" ON public.share_links;
CREATE POLICY "share_links_manage" ON public.share_links
  FOR ALL USING (
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
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (true);