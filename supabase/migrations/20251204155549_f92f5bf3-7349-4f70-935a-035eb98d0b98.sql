-- Drop the existing restrictive INSERT policies
DROP POLICY IF EXISTS "Users can create their own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can create their own cards." ON public.cards;

-- Create a new INSERT policy that allows users to create their own cards OR admins to create for anyone
CREATE POLICY "Users can create their own cards or admins for anyone"
ON public.cards
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) OR is_super_admin(auth.uid())
);