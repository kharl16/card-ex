CREATE TABLE public.global_brochures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  title text NOT NULL DEFAULT 'Company Brochure',
  intro text,
  sort_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.global_brochures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_brochures TO authenticated;
GRANT ALL ON public.global_brochures TO service_role;
ALTER TABLE public.global_brochures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active brochures" ON public.global_brochures FOR SELECT USING (is_active = true OR is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage brochures" ON public.global_brochures FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE TABLE public.global_brochure_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brochure_id uuid NOT NULL REFERENCES public.global_brochures(id) ON DELETE CASCADE,
  heading text NOT NULL DEFAULT '',
  body text,
  sort_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.global_brochure_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_brochure_sections TO authenticated;
GRANT ALL ON public.global_brochure_sections TO service_role;
ALTER TABLE public.global_brochure_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view brochure sections" ON public.global_brochure_sections FOR SELECT USING (true);
CREATE POLICY "Super admins manage brochure sections" ON public.global_brochure_sections FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

ALTER TABLE public.global_brochure_images
  ADD COLUMN IF NOT EXISTS brochure_id uuid REFERENCES public.global_brochures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.global_brochure_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_global_brochure_images_section ON public.global_brochure_images (section_id, sort_index);
CREATE INDEX IF NOT EXISTS idx_global_brochure_sections_brochure ON public.global_brochure_sections (brochure_id, sort_index);

CREATE TABLE public.brochure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  name text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brochure_templates TO authenticated;
GRANT ALL ON public.brochure_templates TO service_role;
ALTER TABLE public.brochure_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage brochure templates" ON public.brochure_templates FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER trg_global_brochures_updated BEFORE UPDATE ON public.global_brochures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_global_brochure_sections_updated BEFORE UPDATE ON public.global_brochure_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brochure_templates_updated BEFORE UPDATE ON public.brochure_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();