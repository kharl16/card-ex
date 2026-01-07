-- Create tools_orb_settings table for customization
CREATE TABLE IF NOT EXISTS public.tools_orb_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  orb_image_url text,
  orb_label text DEFAULT 'Tools',
  items jsonb NOT NULL DEFAULT '[
    {"id": "trainings", "label": "Trainings", "route": "/tools/trainings", "icon_name": "GraduationCap", "order": 1, "enabled": true},
    {"id": "links", "label": "IAM Links", "route": "/tools/links", "icon_name": "Link", "order": 2, "enabled": true},
    {"id": "files", "label": "Files", "route": "/tools/files", "icon_name": "FolderOpen", "order": 3, "enabled": true},
    {"id": "directory", "label": "Branches", "route": "/tools/directory", "icon_name": "Building2", "order": 4, "enabled": true},
    {"id": "presentations", "label": "Presentations", "route": "/tools/presentations", "icon_name": "Presentation", "order": 5, "enabled": true}
  ]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create training_items table
CREATE TABLE IF NOT EXISTS public.training_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  video_url text,
  source_type text DEFAULT 'youtube',
  category text,
  visibility_level text NOT NULL DEFAULT 'public_members',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create presentations table
CREATE TABLE IF NOT EXISTS public.presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  presentation_url text,
  download_url text,
  category text,
  visibility_level text NOT NULL DEFAULT 'public_members',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add icon_url column to iam_links if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iam_links' AND column_name = 'icon_url') THEN
    ALTER TABLE public.iam_links ADD COLUMN icon_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iam_links' AND column_name = 'category') THEN
    ALTER TABLE public.iam_links ADD COLUMN category text;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.tools_orb_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- RLS policies for tools_orb_settings (everyone can read, admins can manage)
CREATE POLICY "Anyone can read tools_orb_settings"
  ON public.tools_orb_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tools_orb_settings"
  ON public.tools_orb_settings FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS policies for training_items
CREATE POLICY "Authenticated can view active trainings"
  ON public.training_items FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage trainings"
  ON public.training_items FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS policies for presentations
CREATE POLICY "Authenticated can view active presentations"
  ON public.presentations FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage presentations"
  ON public.presentations FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Insert default settings row
INSERT INTO public.tools_orb_settings (id, enabled, orb_label)
VALUES ('00000000-0000-0000-0000-000000000001', true, 'Tools')
ON CONFLICT (id) DO NOTHING;