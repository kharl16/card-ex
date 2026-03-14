
-- Create availability_settings table for appointment booking
CREATE TABLE public.availability_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_enabled boolean NOT NULL DEFAULT false,
  working_days jsonb NOT NULL DEFAULT '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
  start_time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '17:00',
  meeting_duration_minutes integer NOT NULL DEFAULT 30,
  buffer_minutes integer NOT NULL DEFAULT 15,
  meeting_purposes jsonb NOT NULL DEFAULT '["General Meeting","Product Demo","Consultation","Follow-up"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.availability_settings ENABLE ROW LEVEL SECURITY;

-- Owner can manage their settings
CREATE POLICY "Users can manage own availability"
  ON public.availability_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public can view settings (needed for booking flow)
CREATE POLICY "Anyone can view availability settings"
  ON public.availability_settings FOR SELECT
  USING (true);

-- Add meeting_purpose column to card_appointments
ALTER TABLE public.card_appointments
  ADD COLUMN IF NOT EXISTS meeting_purpose text;

-- Add user_id reference to card_appointments for easier querying
ALTER TABLE public.card_appointments
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES public.profiles(id);

-- Update trigger for availability_settings
CREATE TRIGGER update_availability_settings_updated_at
  BEFORE UPDATE ON public.availability_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
