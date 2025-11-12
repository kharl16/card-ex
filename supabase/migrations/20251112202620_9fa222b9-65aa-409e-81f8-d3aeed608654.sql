-- Fix infinite recursion in memberships RLS by using a security-definer helper function
-- 1) Helper function evaluated without RLS recursion
create or replace function public.is_org_admin(
  _user_id uuid,
  _org_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = _user_id
      and m.organization_id = _org_id
      and m.role = any (array['owner'::app_role, 'admin'::app_role])
  );
$$;

-- 2) Replace recursive ALL policy with non-recursive, command-specific policies
-- Drop existing potentially-recursive policy if present
DROP POLICY IF EXISTS "Owners and admins can manage memberships" ON public.memberships;

-- Keep/ensure simple SELECT policy (non-recursive)
DROP POLICY IF EXISTS "Members can view their own memberships" ON public.memberships;
CREATE POLICY "Members can view their own memberships"
ON public.memberships
FOR SELECT
USING (
  public.memberships.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_super_admin = true
  )
);

-- Create separate non-recursive policies for DML using the helper function
CREATE POLICY "Owners/admins can insert memberships"
ON public.memberships
FOR INSERT
WITH CHECK (
  public.is_org_admin(auth.uid(), organization_id)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
);

CREATE POLICY "Owners/admins can update memberships"
ON public.memberships
FOR UPDATE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
)
WITH CHECK (
  public.is_org_admin(auth.uid(), organization_id)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
);

CREATE POLICY "Owners/admins can delete memberships"
ON public.memberships
FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
);
