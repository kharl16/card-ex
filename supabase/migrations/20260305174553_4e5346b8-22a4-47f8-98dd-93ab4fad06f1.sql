
-- Create user_orb_overrides table
CREATE TABLE public.user_orb_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  orb_label text,
  orb_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_orb_overrides ENABLE ROW LEVEL SECURITY;

-- Users can manage their own row
CREATE POLICY "Users can manage own orb overrides"
  ON public.user_orb_overrides
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Super admins can manage all rows
CREATE POLICY "Super admins can manage all orb overrides"
  ON public.user_orb_overrides
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_user_orb_overrides_updated_at
  BEFORE UPDATE ON public.user_orb_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
