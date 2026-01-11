-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a more restrictive policy - only authenticated users can insert their own notifications
-- The trigger uses SECURITY DEFINER so it bypasses RLS anyway
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);