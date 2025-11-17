-- Drop policies that depend on is_super_admin column
DROP POLICY IF EXISTS "Super admins can view all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all cards." ON public.cards;

-- Drop the is_super_admin column from profiles table
-- This completes the migration to the user_roles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_super_admin;