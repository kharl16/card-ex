-- Global product images (admin-managed, shown on all cards)
CREATE TABLE public.global_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption text,
  sort_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.global_product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active global product images"
ON public.global_product_images FOR SELECT
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage global product images"
ON public.global_product_images FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER global_product_images_updated_at
BEFORE UPDATE ON public.global_product_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-card overrides: lets card owners hide specific global images from their card
CREATE TABLE public.card_global_image_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  global_image_id uuid NOT NULL REFERENCES public.global_product_images(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, global_image_id)
);

ALTER TABLE public.card_global_image_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read overrides for published cards or owner"
ON public.card_global_image_overrides FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_global_image_overrides.card_id
      AND (c.is_published = true OR c.user_id = auth.uid())
  ) OR is_super_admin(auth.uid())
);

CREATE POLICY "Card owners manage own overrides"
ON public.card_global_image_overrides FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_global_image_overrides.card_id
      AND c.user_id = auth.uid()
  ) OR is_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_global_image_overrides.card_id
      AND c.user_id = auth.uid()
  ) OR is_super_admin(auth.uid())
);

CREATE INDEX idx_card_global_overrides_card ON public.card_global_image_overrides(card_id);
CREATE INDEX idx_global_product_images_active_sort ON public.global_product_images(is_active, sort_index);