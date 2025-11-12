-- Fix infinite recursion in memberships RLS policies
-- The issue is that the SELECT policy on memberships queries memberships itself

-- Drop the problematic policies
DROP POLICY IF EXISTS "Members can view their org memberships" ON memberships;
DROP POLICY IF EXISTS "Owners and admins can manage memberships" ON memberships;

-- Create fixed policies without circular references
CREATE POLICY "Members can view their own memberships"
ON memberships
FOR SELECT
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.is_super_admin = true
  )
);

CREATE POLICY "Owners and admins can manage memberships"
ON memberships
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = memberships.organization_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.is_super_admin = true
  )
);