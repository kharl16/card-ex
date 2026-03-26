
-- 1. Prospects table
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  email text,
  messenger_link text,
  telegram text,
  whatsapp text,
  location text,
  occupation text,
  company text,
  source_type text NOT NULL DEFAULT 'manual',
  source_detail text,
  interest_level text NOT NULL DEFAULT 'warm',
  pipeline_status text NOT NULL DEFAULT 'new',
  priority_level text NOT NULL DEFAULT 'medium',
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  last_activity_at timestamptz,
  converted_at timestamptz,
  notes text,
  tags jsonb DEFAULT '[]'::jsonb,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- 2. Prospect activities table
CREATE TABLE public.prospect_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  activity_title text,
  activity_note text,
  activity_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Prospect follow-ups table
CREATE TABLE public.prospect_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  followup_type text NOT NULL DEFAULT 'follow_up',
  status text NOT NULL DEFAULT 'pending',
  note text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_prospects_owner ON public.prospects(owner_user_id);
CREATE INDEX idx_prospects_pipeline ON public.prospects(pipeline_status);
CREATE INDEX idx_prospects_follow_up ON public.prospects(next_follow_up_at);
CREATE INDEX idx_prospect_activities_prospect ON public.prospect_activities(prospect_id);
CREATE INDEX idx_prospect_followups_prospect ON public.prospect_followups(prospect_id);
CREATE INDEX idx_prospect_followups_scheduled ON public.prospect_followups(scheduled_at);

-- Updated_at triggers
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_followups ENABLE ROW LEVEL SECURITY;

-- Prospects RLS
CREATE POLICY "Users can manage own prospects" ON public.prospects
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Admins can manage all prospects" ON public.prospects
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Activities RLS
CREATE POLICY "Users can manage own activities" ON public.prospect_activities
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Admins can manage all activities" ON public.prospect_activities
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Follow-ups RLS
CREATE POLICY "Users can manage own followups" ON public.prospect_followups
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Admins can manage all followups" ON public.prospect_followups
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
