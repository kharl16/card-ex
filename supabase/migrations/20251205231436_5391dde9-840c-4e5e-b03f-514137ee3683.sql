-- Create card_templates table
CREATE TABLE public.card_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  thumbnail_url text,
  layout_data jsonb NOT NULL,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;

-- Create unique index to enforce one personal template per non-admin user
-- This only applies to non-global templates (personal templates)
CREATE UNIQUE INDEX unique_personal_template_per_user 
ON public.card_templates (owner_id) 
WHERE is_global = false;

-- RLS Policies

-- Anyone authenticated can read global templates
CREATE POLICY "Anyone can view global templates"
ON public.card_templates
FOR SELECT
USING (is_global = true);

-- Users can view their own templates
CREATE POLICY "Users can view their own templates"
ON public.card_templates
FOR SELECT
USING (auth.uid() = owner_id);

-- Admins can view all templates
CREATE POLICY "Admins can view all templates"
ON public.card_templates
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Users can create templates (app logic enforces one personal template per user)
CREATE POLICY "Users can create templates"
ON public.card_templates
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
ON public.card_templates
FOR UPDATE
USING (auth.uid() = owner_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
ON public.card_templates
FOR DELETE
USING (auth.uid() = owner_id);

-- Admins can manage all templates
CREATE POLICY "Admins can manage all templates"
ON public.card_templates
FOR ALL
USING (is_super_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_card_templates_updated_at
BEFORE UPDATE ON public.card_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();