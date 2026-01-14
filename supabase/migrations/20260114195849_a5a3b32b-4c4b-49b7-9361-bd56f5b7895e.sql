-- First, let's clean up duplicate referrals by keeping the most complete one
-- For each duplicate pair, keep the one with the most data (payment_id, referred_card_id)

-- Step 1: Create a temp table with duplicates and which to keep
WITH ranked_referrals AS (
  SELECT 
    id,
    referrer_user_id,
    referred_user_id,
    ROW_NUMBER() OVER (
      PARTITION BY referrer_user_id, referred_user_id 
      ORDER BY 
        CASE WHEN payment_id IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN referred_card_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
    ) as rn
  FROM referrals
),
duplicates_to_delete AS (
  SELECT id FROM ranked_referrals WHERE rn > 1
)
DELETE FROM referrals 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Step 2: Add unique constraint to prevent future duplicates
-- A referrer-referred pair should only have ONE referral record
ALTER TABLE referrals 
ADD CONSTRAINT referrals_referrer_referred_unique 
UNIQUE (referrer_user_id, referred_user_id);