-- Update RLS policy on card_events to prevent direct client inserts
-- Only allow inserts through the Edge Function with service role

DROP POLICY IF EXISTS "Anyone can insert events" ON public.card_events;

-- Service role (used by Edge Function) can still insert
-- Regular users and anonymous users cannot insert directly
CREATE POLICY "Only service role can insert events"
  ON public.card_events
  FOR INSERT
  WITH CHECK (false);

-- Keep existing SELECT policy for card owners
-- (Already exists: "Card owners can view events")