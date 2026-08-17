CREATE TABLE public.bible_wisdom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number integer NOT NULL CHECK (day_number BETWEEN 1 AND 365),
  time_slot text NOT NULL CHECK (time_slot IN ('morning','midday','evening')),
  theme text NOT NULL,
  bible_book text NOT NULL,
  chapter integer NOT NULL,
  verse text NOT NULL,
  reference text NOT NULL,
  verse_text text NOT NULL,
  bible_translation text NOT NULL DEFAULT 'WEB',
  title text NOT NULL,
  reflection text NOT NULL,
  business_principle text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bible_wisdom_day_slot_active_uniq
  ON public.bible_wisdom (day_number, time_slot)
  WHERE is_active = true;

CREATE INDEX bible_wisdom_day_idx ON public.bible_wisdom (day_number);
CREATE INDEX bible_wisdom_theme_idx ON public.bible_wisdom (theme);
CREATE INDEX bible_wisdom_book_idx ON public.bible_wisdom (bible_book);

GRANT SELECT ON public.bible_wisdom TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bible_wisdom TO authenticated;
GRANT ALL ON public.bible_wisdom TO service_role;

ALTER TABLE public.bible_wisdom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active bible wisdom"
  ON public.bible_wisdom FOR SELECT
  USING (is_active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins insert bible wisdom"
  ON public.bible_wisdom FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins update bible wisdom"
  ON public.bible_wisdom FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins delete bible wisdom"
  ON public.bible_wisdom FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_bible_wisdom_updated_at
  BEFORE UPDATE ON public.bible_wisdom
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bible_wisdom_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bible_wisdom_id uuid NOT NULL REFERENCES public.bible_wisdom(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bible_wisdom_id)
);

GRANT SELECT, INSERT, DELETE ON public.bible_wisdom_favorites TO authenticated;
GRANT ALL ON public.bible_wisdom_favorites TO service_role;

ALTER TABLE public.bible_wisdom_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bible favorites"
  ON public.bible_wisdom_favorites FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add own bible favorites"
  ON public.bible_wisdom_favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own bible favorites"
  ON public.bible_wisdom_favorites FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.bible_wisdom_notification_prefs (
  user_id uuid PRIMARY KEY,
  morning_enabled boolean NOT NULL DEFAULT true,
  midday_enabled boolean NOT NULL DEFAULT true,
  evening_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bible_wisdom_notification_prefs TO authenticated;
GRANT ALL ON public.bible_wisdom_notification_prefs TO service_role;

ALTER TABLE public.bible_wisdom_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bible wisdom notification prefs"
  ON public.bible_wisdom_notification_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_bible_wisdom_prefs_updated_at
  BEFORE UPDATE ON public.bible_wisdom_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value)
VALUES ('bible_wisdom_reference_date', '2026-01-01')
ON CONFLICT (key) DO NOTHING;