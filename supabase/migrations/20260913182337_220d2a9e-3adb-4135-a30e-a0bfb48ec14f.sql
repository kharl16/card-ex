CREATE TABLE public.global_brochure_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  url_2 text,
  caption text,
  srp text,
  sort_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.global_brochure_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_brochure_images TO authenticated;
GRANT ALL ON public.global_brochure_images TO service_role;

ALTER TABLE public.global_brochure_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active global brochure images"
ON public.global_brochure_images FOR SELECT
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage global brochure images"
ON public.global_brochure_images FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER global_brochure_images_updated_at
BEFORE UPDATE ON public.global_brochure_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_global_brochure_images_active_sort
  ON public.global_brochure_images(is_active, sort_index);

CREATE TABLE public.card_global_brochure_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  global_brochure_image_id uuid NOT NULL REFERENCES public.global_brochure_images(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, global_brochure_image_id)
);

GRANT SELECT ON public.card_global_brochure_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_global_brochure_overrides TO authenticated;
GRANT ALL ON public.card_global_brochure_overrides TO service_role;

ALTER TABLE public.card_global_brochure_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read brochure overrides for published cards or owner"
ON public.card_global_brochure_overrides FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_global_brochure_overrides.card_id
      AND (c.is_published = true OR c.user_id = auth.uid())
  ) OR is_super_admin(auth.uid())
);

CREATE POLICY "Card owners manage own brochure overrides"
ON public.card_global_brochure_overrides FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_global_brochure_overrides.card_id
      AND c.user_id = auth.uid()
  ) OR is_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_global_brochure_overrides.card_id
      AND c.user_id = auth.uid()
  ) OR is_super_admin(auth.uid())
);

CREATE INDEX idx_card_global_brochure_overrides_card
  ON public.card_global_brochure_overrides(card_id);

ALTER TABLE public.card_global_brochure_overrides REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_global_brochure_overrides;