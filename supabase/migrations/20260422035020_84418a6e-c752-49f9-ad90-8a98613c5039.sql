ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tool_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.tool_preferences IS
  'Per-user preferences for Tools Orb tools (affirmations, books, mindset). Shape: { affirmations: { language, category }, books: { language, favoriteBookId, lastViewedBookId }, mindset: { lastResult } }';