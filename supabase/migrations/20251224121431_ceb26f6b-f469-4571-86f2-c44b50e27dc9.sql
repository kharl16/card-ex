-- Create admin_patches table for audit logging design patches
CREATE TABLE public.admin_patches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  admin_user_id uuid NOT NULL,
  template_id uuid REFERENCES public.card_templates(id) ON DELETE SET NULL,
  target_mode text NOT NULL CHECK (target_mode IN ('selected', 'all')),
  target_card_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  patch_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_template jsonb,
  before_states jsonb DEFAULT '{}'::jsonb,
  cards_affected integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back'))
);

-- Add design_version and last_design_patch_id to cards table
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS design_version integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_design_patch_id uuid REFERENCES public.admin_patches(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.admin_patches ENABLE ROW LEVEL SECURITY;

-- Only super admins can access admin_patches
CREATE POLICY "Super admins can manage admin_patches"
ON public.admin_patches
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_admin_patches_created_at ON public.admin_patches(created_at DESC);
CREATE INDEX idx_admin_patches_admin_user_id ON public.admin_patches(admin_user_id);
CREATE INDEX idx_admin_patches_status ON public.admin_patches(status);
CREATE INDEX idx_cards_design_version ON public.cards(design_version);
CREATE INDEX idx_cards_last_design_patch_id ON public.cards(last_design_patch_id);