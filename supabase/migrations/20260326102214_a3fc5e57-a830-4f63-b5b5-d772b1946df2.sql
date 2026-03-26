
CREATE TABLE public.prospect_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'first_contact',
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scripts"
  ON public.prospect_scripts
  FOR ALL
  TO authenticated
  USING (owner_user_id = auth.uid() OR is_default = true)
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can read default scripts"
  ON public.prospect_scripts
  FOR SELECT
  TO authenticated
  USING (is_default = true);

CREATE TRIGGER update_prospect_scripts_updated_at
  BEFORE UPDATE ON public.prospect_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
