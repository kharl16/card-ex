UPDATE public.profiles
SET 
  referred_by_user_id = '089b30ea-a463-4bd4-a4b1-9bb5435d0750',
  referred_by_code = 'CEX-ACD148',
  referred_by_name = 'Janette B. Juyad'
WHERE id = '3a404b5b-f235-4289-8e59-9c5321b42fb2';

UPDATE public.cards
SET 
  referred_by_user_id = '089b30ea-a463-4bd4-a4b1-9bb5435d0750',
  referred_by_code = 'CEX-ACD148',
  referred_by_name = 'Janette B. Juyad'
WHERE user_id = '3a404b5b-f235-4289-8e59-9c5321b42fb2';