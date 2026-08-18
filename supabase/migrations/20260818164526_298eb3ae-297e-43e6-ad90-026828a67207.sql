
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS other_social_url text,
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS sponsor_name text,
  ADD COLUMN IF NOT EXISTS referral_campaign text,
  ADD COLUMN IF NOT EXISTS interest_type text NOT NULL DEFAULT 'undecided',
  ADD COLUMN IF NOT EXISTS product_interests jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS relationship_strength text,
  ADD COLUMN IF NOT EXISTS won_at timestamptz,
  ADD COLUMN IF NOT EXISTS won_result text,
  ADD COLUMN IF NOT EXISTS won_notes text;

ALTER TABLE public.prospect_activities
  ADD COLUMN IF NOT EXISTS outcome text;

ALTER TABLE public.prospect_followups
  ADD COLUMN IF NOT EXISTS completion_note text;

CREATE TABLE IF NOT EXISTS public.prospect_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  new_prospects_per_day integer NOT NULL DEFAULT 5,
  contacts_per_day integer NOT NULL DEFAULT 10,
  presentations_per_week integer NOT NULL DEFAULT 5,
  followups_per_day integer NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_goals TO authenticated;
GRANT ALL ON public.prospect_goals TO service_role;

ALTER TABLE public.prospect_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own prospecting goals" ON public.prospect_goals;
CREATE POLICY "Users manage their own prospecting goals"
  ON public.prospect_goals FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_prospect_goals_updated_at ON public.prospect_goals;
CREATE TRIGGER update_prospect_goals_updated_at
  BEFORE UPDATE ON public.prospect_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_prospects_owner_stage ON public.prospects (owner_user_id, pipeline_status);
CREATE INDEX IF NOT EXISTS idx_prospects_owner_followup ON public.prospects (owner_user_id, next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_prospects_owner_created ON public.prospects (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON public.prospects (owner_user_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_prospects_phone ON public.prospects (owner_user_id, phone);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_prospect ON public.prospect_activities (prospect_id, activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_followups_owner_sched ON public.prospect_followups (owner_user_id, scheduled_at);
