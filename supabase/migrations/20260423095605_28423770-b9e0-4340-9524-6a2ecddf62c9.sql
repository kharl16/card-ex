-- Default booking_enabled to true for new rows
ALTER TABLE public.availability_settings ALTER COLUMN booking_enabled SET DEFAULT true;

-- Enable booking for all existing users
UPDATE public.availability_settings SET booking_enabled = true WHERE booking_enabled = false;