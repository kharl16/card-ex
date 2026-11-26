CREATE TABLE public.global_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text,
  description text,
  sort_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.global_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_videos TO authenticated;
GRANT ALL ON public.global_videos TO service_role;
ALTER TABLE public.global_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active global videos" ON public.global_videos FOR SELECT
  USING (is_active = true OR public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage global videos" ON public.global_videos FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));