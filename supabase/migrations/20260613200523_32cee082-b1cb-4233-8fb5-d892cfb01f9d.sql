
-- 1. companies table
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  brand_color text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view companies"
  ON public.companies FOR SELECT USING (true);

CREATE POLICY "Super admins manage companies"
  ON public.companies FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX companies_single_default
  ON public.companies ((is_default)) WHERE is_default = true;

INSERT INTO public.companies (slug, name, brand_color, is_default)
VALUES ('iam-worldwide', 'IAM Worldwide', '#D4AF37', true);

-- 2. default_company_id helper (no dependency on other new columns)
CREATE OR REPLACE FUNCTION public.default_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.companies WHERE is_default = true LIMIT 1 $$;

-- 3. Add company_id to profiles & cards (so current_user_company_id() can reference it)
ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.cards    ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

UPDATE public.profiles SET company_id = public.default_company_id() WHERE company_id IS NULL;
UPDATE public.cards    SET company_id = public.default_company_id() WHERE company_id IS NULL;

CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_cards_company_id    ON public.cards(company_id);

-- 4. Now safe to create current_user_company_id
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.profiles WHERE id = auth.uid() $$;

-- 5. Tag every content library
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'training_items','training_folders','Videos','ambassadors_library',
    'tools','iam_links',
    'IAM Files','files_repository',
    'global_product_images','global_package_images','global_testimony_images',
    'presentations','directory_entries','daily_quotes','ways_13',
    'tools_orb_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE',
      t
    );
    EXECUTE format(
      'UPDATE public.%I SET company_id = public.default_company_id() WHERE company_id IS NULL',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id)',
      'idx_' || replace(lower(t), ' ', '_') || '_company_id', t
    );
  END LOOP;
END $$;

-- 6. Update signup hook to assign default company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  referral_code_input TEXT;
  referrer_record RECORD;
  v_default_company uuid;
BEGIN
  v_default_company := public.default_company_id();

  INSERT INTO public.profiles (id, full_name, company_id)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', v_default_company);

  referral_code_input := new.raw_user_meta_data->>'referral_code';

  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    SELECT id, full_name, referral_code
    INTO referrer_record
    FROM public.profiles
    WHERE referral_code = referral_code_input;

    IF referrer_record IS NOT NULL THEN
      UPDATE public.profiles
      SET
        referred_by_user_id = referrer_record.id,
        referred_by_code = referrer_record.referral_code,
        referred_by_name = referrer_record.full_name
      WHERE id = new.id;
    END IF;
  END IF;

  RETURN new;
END;
$$;
