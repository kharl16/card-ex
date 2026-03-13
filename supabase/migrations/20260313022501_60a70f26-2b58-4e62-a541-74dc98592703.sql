
-- Create card_appointments table for booking requests
CREATE TABLE public.card_appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  visitor_email text NOT NULL,
  visitor_phone text,
  visitor_message text,
  appointment_date date NOT NULL,
  appointment_time text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.card_appointments ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an appointment (public-facing form)
CREATE POLICY "Anyone can create appointments" ON public.card_appointments
  FOR INSERT TO public
  WITH CHECK (true);

-- Card owners can view appointments for their cards
CREATE POLICY "Card owners can view appointments" ON public.card_appointments
  FOR SELECT TO public
  USING (
    card_id IN (SELECT id FROM public.cards WHERE user_id = auth.uid())
    OR is_super_admin(auth.uid())
  );

-- Card owners can update appointment status
CREATE POLICY "Card owners can update appointments" ON public.card_appointments
  FOR UPDATE TO public
  USING (
    card_id IN (SELECT id FROM public.cards WHERE user_id = auth.uid())
    OR is_super_admin(auth.uid())
  );

-- Card owners can delete appointments
CREATE POLICY "Card owners can delete appointments" ON public.card_appointments
  FOR DELETE TO public
  USING (
    card_id IN (SELECT id FROM public.cards WHERE user_id = auth.uid())
    OR is_super_admin(auth.uid())
  );

-- Add updated_at trigger
CREATE TRIGGER update_card_appointments_updated_at
  BEFORE UPDATE ON public.card_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
