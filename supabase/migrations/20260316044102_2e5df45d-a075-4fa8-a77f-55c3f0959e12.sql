
-- Create AI training Q&A table
CREATE TABLE public.ai_training_qa (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid REFERENCES public.cards(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- card_id NULL = global Q&A, card_id set = per-card Q&A
CREATE INDEX idx_ai_training_qa_card_id ON public.ai_training_qa(card_id);
CREATE INDEX idx_ai_training_qa_global ON public.ai_training_qa(card_id) WHERE card_id IS NULL;

-- Enable RLS
ALTER TABLE public.ai_training_qa ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all Q&A
CREATE POLICY "Super admins can manage all Q&A"
  ON public.ai_training_qa FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Card owners can manage their own card Q&A
CREATE POLICY "Card owners can manage card Q&A"
  ON public.ai_training_qa FOR ALL
  USING (
    card_id IS NOT NULL AND card_id IN (
      SELECT id FROM public.cards WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    card_id IS NOT NULL AND card_id IN (
      SELECT id FROM public.cards WHERE user_id = auth.uid()
    )
  );

-- Anyone can read active Q&A for published cards (needed by edge function via service role, but also for public access)
CREATE POLICY "Public can read active Q&A for published cards"
  ON public.ai_training_qa FOR SELECT
  USING (
    is_active = true AND (
      card_id IS NULL OR 
      card_id IN (SELECT id FROM public.cards WHERE is_published = true)
    )
  );

-- Updated at trigger
CREATE TRIGGER update_ai_training_qa_updated_at
  BEFORE UPDATE ON public.ai_training_qa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
