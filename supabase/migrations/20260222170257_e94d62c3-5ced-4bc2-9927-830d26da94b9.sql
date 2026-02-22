-- Add video_items JSONB column to cards table
ALTER TABLE public.cards
ADD COLUMN video_items jsonb NOT NULL DEFAULT '[]'::jsonb;