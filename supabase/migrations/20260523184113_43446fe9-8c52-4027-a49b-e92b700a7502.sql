CREATE TABLE public.card_global_testimony_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  global_testimony_image_id uuid NOT NULL REFERENCES public.global_testimony_images(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, global_testimony_image_id)
);

CREATE INDEX idx_cgto_card ON public.card_global_testimony_overrides(card_id);
CREATE INDEX idx_cgto_global ON public.card_global_testimony_overrides(global_testimony_image_id);

ALTER TABLE public.card_global_testimony_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read testimony overrides for published cards or owner"
ON public.card_global_testimony_overrides
FOR SELECT
USING (
  public.is_card_published(card_id)
  OR EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.user_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Card owners manage own testimony overrides"
ON public.card_global_testimony_overrides
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.user_id = auth.uid())
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.user_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.card_global_testimony_overrides;