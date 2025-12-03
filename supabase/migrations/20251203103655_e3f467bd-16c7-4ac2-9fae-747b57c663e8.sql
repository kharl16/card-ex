-- Drop the overly permissive public profiles policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;

-- The existing policies remain:
-- "Users can view their own profile" (auth.uid() = id OR is_super_admin)
-- "Users can update their own profile" (auth.uid() = id)
-- "Users can insert their own profile" (auth.uid() = id)