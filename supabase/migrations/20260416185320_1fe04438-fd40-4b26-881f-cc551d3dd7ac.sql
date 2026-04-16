-- Remove duplicate/redundant policies on cards (keep the canonical ones)
DROP POLICY IF EXISTS "Published cards are viewable by everyone." ON public.cards;
DROP POLICY IF EXISTS "Users can view their own cards." ON public.cards;
DROP POLICY IF EXISTS "Users can update their own cards." ON public.cards;
DROP POLICY IF EXISTS "Users can delete their own cards." ON public.cards;

-- Remove unrestricted public read on IAM Files; require authentication
DROP POLICY IF EXISTS "Public can view IAM Files" ON public."IAM Files";

-- Remove misleading INSERT policy on card_events. Service role bypasses RLS,
-- so this `false` policy adds no protection but blocks any future authenticated insert path.
DROP POLICY IF EXISTS "Only service role can insert events" ON public.card_events;
