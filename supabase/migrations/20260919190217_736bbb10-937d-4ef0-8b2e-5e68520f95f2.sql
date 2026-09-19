UPDATE public.cards
SET showcase_display_mode = 'immersive'
WHERE showcase_display_mode IS DISTINCT FROM 'immersive';

ALTER TABLE public.cards
ALTER COLUMN showcase_display_mode SET DEFAULT 'immersive';