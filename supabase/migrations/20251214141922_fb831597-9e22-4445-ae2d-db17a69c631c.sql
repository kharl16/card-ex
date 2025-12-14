-- Add referred_by_user_id to profiles table for tracking referral relationships
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES public.profiles(id);

-- Add visibility column to card_templates (global, team, private)
-- First add the column as text, then we'll use it with enum-like values
ALTER TABLE public.card_templates 
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

-- Update existing templates: is_global=true becomes visibility='global', is_global=false becomes visibility='private'
UPDATE public.card_templates 
SET visibility = CASE WHEN is_global = true THEN 'global' ELSE 'private' END;

-- Create index for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by_user_id);

-- Create index for visibility-based template queries  
CREATE INDEX IF NOT EXISTS idx_card_templates_visibility ON public.card_templates(visibility);

-- Update RLS policies for card_templates to handle visibility
DROP POLICY IF EXISTS "Anyone can view global templates" ON public.card_templates;
DROP POLICY IF EXISTS "Users can view their own templates" ON public.card_templates;
DROP POLICY IF EXISTS "Admins can view all templates" ON public.card_templates;

-- New policy: Users can view global templates, their own templates, and team templates from their referrer
CREATE POLICY "Users can view accessible templates" ON public.card_templates
FOR SELECT USING (
  visibility = 'global' 
  OR owner_id = auth.uid()
  OR (
    visibility = 'team' 
    AND owner_id = (SELECT referred_by_user_id FROM public.profiles WHERE id = auth.uid())
  )
  OR is_super_admin(auth.uid())
);