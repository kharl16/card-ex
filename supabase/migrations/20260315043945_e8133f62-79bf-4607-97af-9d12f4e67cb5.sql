
-- Allow anonymous visitors to read appointment slots to prevent double-booking
CREATE POLICY "Public can view appointment slots"
ON public.card_appointments
FOR SELECT
TO anon, authenticated
USING (true);

-- Create leads table for Mini CRM
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  status text NOT NULL DEFAULT 'new',
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Lead owners can manage their leads
CREATE POLICY "Users can manage own leads"
ON public.leads
FOR ALL
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Super admins can manage all leads
CREATE POLICY "Admins can manage all leads"
ON public.leads
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Anyone can insert leads (for public forms)
CREATE POLICY "Anyone can insert leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
