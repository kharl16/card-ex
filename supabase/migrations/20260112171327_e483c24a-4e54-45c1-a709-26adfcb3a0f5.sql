-- Add sort_order columns to tables that need ordering
-- Training items
ALTER TABLE public.training_items
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- IAM Links
ALTER TABLE public.iam_links
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Files repository
ALTER TABLE public.files_repository
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Directory entries
ALTER TABLE public.directory_entries
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Presentations
ALTER TABLE public.presentations
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Create indexes for sort_order on each table
CREATE INDEX IF NOT EXISTS idx_training_items_sort_order ON public.training_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_iam_links_sort_order ON public.iam_links(sort_order);
CREATE INDEX IF NOT EXISTS idx_files_repository_sort_order ON public.files_repository(sort_order);
CREATE INDEX IF NOT EXISTS idx_directory_entries_sort_order ON public.directory_entries(sort_order);
CREATE INDEX IF NOT EXISTS idx_presentations_sort_order ON public.presentations(sort_order);