CREATE OR REPLACE FUNCTION public.is_paid_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (SELECT 1 FROM public.cards WHERE user_id = _user_id AND is_paid = true);
$$;
REVOKE EXECUTE ON FUNCTION public.is_paid_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_paid_member(uuid) TO authenticated, service_role;

CREATE TABLE public.member_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_size bigint,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_presentations TO authenticated;
GRANT ALL ON public.member_presentations TO service_role;
ALTER TABLE public.member_presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin manages member presentations" ON public.member_presentations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Paid members view active presentations" ON public.member_presentations FOR SELECT TO authenticated
  USING (is_active AND public.is_paid_member(auth.uid()));
CREATE POLICY "Exclude guest sessions" ON public.member_presentations AS RESTRICTIVE FOR ALL TO authenticated
  USING (COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false)
  WITH CHECK (COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);
CREATE TRIGGER update_member_presentations_updated_at BEFORE UPDATE ON public.member_presentations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Super admin manages presentation files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'member-presentations' AND public.is_super_admin(auth.uid()))
  WITH CHECK (bucket_id = 'member-presentations' AND public.is_super_admin(auth.uid()));
CREATE POLICY "Paid members read presentation files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'member-presentations' AND public.is_paid_member(auth.uid())
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);