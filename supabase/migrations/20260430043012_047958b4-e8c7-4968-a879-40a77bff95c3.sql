-- 1) Global package images (admin-managed, shown on all cards)
CREATE TABLE public.global_package_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption text,
  sort_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.global_package_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active global package images"
ON public.global_package_images FOR SELECT
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage global package images"
ON public.global_package_images FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER global_package_images_updated_at
BEFORE UPDATE ON public.global_package_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_global_package_images_active_sort
  ON public.global_package_images(is_active, sort_index);

-- 2) Per-card overrides for hiding global package images
CREATE TABLE public.card_global_package_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  global_package_image_id uuid NOT NULL REFERENCES public.global_package_images(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, global_package_image_id)
);

ALTER TABLE public.card_global_package_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read package overrides for published cards or owner"
ON public.card_global_package_overrides FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_global_package_overrides.card_id
      AND (c.is_published = true OR c.user_id = auth.uid())
  ) OR is_super_admin(auth.uid())
);

CREATE POLICY "Card owners manage own package overrides"
ON public.card_global_package_overrides FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_global_package_overrides.card_id
      AND c.user_id = auth.uid()
  ) OR is_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_global_package_overrides.card_id
      AND c.user_id = auth.uid()
  ) OR is_super_admin(auth.uid())
);

CREATE INDEX idx_card_global_package_overrides_card
  ON public.card_global_package_overrides(card_id);

-- 3) Realtime sync for overrides
ALTER TABLE public.card_global_package_overrides REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_global_package_overrides;

-- 4) Seed Hope, Copper, Bronze using the verified working image URLs
INSERT INTO public.global_package_images (url, caption, sort_index, is_active)
VALUES
  ('https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/cardex-products/a0efd175-4704-495e-a755-a18d1bd8dab8/8bf1af4d-61a6-4196-9ce4-f58de7f75b33/packages/0b00ea25-20e5-4eca-a237-3bd1d64f9815.jpg', 'Copper', 0, true),
  ('https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/cardex-products/a0efd175-4704-495e-a755-a18d1bd8dab8/8bf1af4d-61a6-4196-9ce4-f58de7f75b33/packages/570d13cf-2d77-40f9-ba99-b390df571dee.jpg', 'Bronze', 1, true),
  ('https://lorowpouhpjjxembvwyi.supabase.co/storage/v1/object/public/cardex-products/a0efd175-4704-495e-a755-a18d1bd8dab8/8bf1af4d-61a6-4196-9ce4-f58de7f75b33/packages/0594ee28-d4e3-4243-a545-727df67c5e23.jpg', 'Hope', 2, true);

-- 5) Strip the per-card Hope/Copper/Bronze package entries from every card EXCEPT Maria Grace Mulato's,
--    so those three render from the global library instead (no more name-without-image).
UPDATE public.cards c
SET package_images = COALESCE(
  (
    SELECT jsonb_agg(elem ORDER BY (elem->>'order')::int NULLS LAST)
    FROM jsonb_array_elements(c.package_images) AS elem
    WHERE elem->>'alt' NOT IN ('Hope', 'Copper', 'Bronze')
  ),
  '[]'::jsonb
)
WHERE c.id <> '3e66e43a-a01e-4f55-8e7e-885ba94875a9'
  AND c.package_images IS NOT NULL
  AND jsonb_typeof(c.package_images) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(c.package_images) AS e
    WHERE e->>'alt' IN ('Hope', 'Copper', 'Bronze')
  );

-- 6) Hide the new globals from Maria Grace Mulato's card (her card already has its own Silver/Gold/Platinum/Jade
--    and per the user's instruction the globals should not appear there).
INSERT INTO public.card_global_package_overrides (card_id, global_package_image_id)
SELECT '3e66e43a-a01e-4f55-8e7e-885ba94875a9', g.id
FROM public.global_package_images g
WHERE g.caption IN ('Hope', 'Copper', 'Bronze')
ON CONFLICT (card_id, global_package_image_id) DO NOTHING;