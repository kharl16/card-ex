-- Fix referrals table by syncing referrer_user_id from cards table
-- The cards.referred_by_user_id has the correct referrer information

UPDATE public.referrals r
SET referrer_user_id = c.referred_by_user_id
FROM public.cards c
WHERE r.referred_card_id = c.id
  AND c.referred_by_user_id IS NOT NULL
  AND r.referrer_user_id != c.referred_by_user_id;