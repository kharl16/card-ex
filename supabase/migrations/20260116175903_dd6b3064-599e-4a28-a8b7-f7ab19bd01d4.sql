
-- Fix the referral record for Bryan Dumalasa to correctly link to Robin Toliongco
UPDATE referrals 
SET referrer_user_id = '9eeacfb7-bce0-4be3-bed4-dd5574c786c5'  -- Robin Toliongco's user ID
WHERE id = 'c9e1b8ac-1dc1-4e8c-b743-05d7c66c927a'  -- Bryan's referral record
  AND referred_card_id = 'e98067cf-c0fe-4402-aeb0-cc14bcae999b';  -- Bryan's card ID
