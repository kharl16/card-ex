
-- 1. Appointments: remove public read of all rows; expose only booked time slots via RPC
DROP POLICY IF EXISTS "Public can view appointment slots" ON public.card_appointments;

CREATE OR REPLACE FUNCTION public.get_booked_appointment_slots(p_card_id uuid, p_date date)
RETURNS TABLE(appointment_time text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT appointment_time
  FROM public.card_appointments
  WHERE card_id = p_card_id
    AND appointment_date = p_date
    AND status IN ('pending', 'confirmed');
$$;

REVOKE ALL ON FUNCTION public.get_booked_appointment_slots(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_appointment_slots(uuid, date) TO anon, authenticated;

-- 2. Leads: enforce owner_user_id matches the actual card owner on insert
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;

CREATE POLICY "Anyone can insert leads for actual card owner"
ON public.leads
FOR INSERT
WITH CHECK (
  card_id IS NOT NULL
  AND owner_user_id = (SELECT user_id FROM public.cards WHERE id = card_id)
);

-- 3. cards_public view: switch to security_invoker so caller permissions/RLS apply
ALTER VIEW public.cards_public SET (security_invoker = on);

-- 4. Realtime channel authorization: only allow users to subscribe to their own card topics
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to their own card channels" ON realtime.messages;
CREATE POLICY "Users can subscribe to their own card channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.user_id = auth.uid()
      AND (
        topic = 'card:' || c.id::text
        OR topic LIKE 'card:' || c.id::text || ':%'
        OR topic = c.id::text
      )
  )
  OR topic NOT LIKE 'card:%'
);
