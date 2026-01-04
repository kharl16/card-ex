-- =====================================================
-- RESOURCES HUB COMPLETE SCHEMA
-- Extends existing role system + creates resource tables
-- =====================================================

-- 1. Extend app_role enum to include 'leader' if not exists
-- Note: app_role already has owner, admin, member. We need to add 'leader' and ensure we can reference them
-- We'll use text for resource_role to be flexible

-- 2. Create visibility level type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_level') THEN
    CREATE TYPE visibility_level AS ENUM ('public_members', 'leaders_only', 'admins_only', 'super_admin_only');
  END IF;
END $$;

-- 3. Create resource_role type for the resources system
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_role') THEN
    CREATE TYPE resource_role AS ENUM ('member', 'leader', 'admin', 'super_admin');
  END IF;
END $$;

-- 4. Create resource_roles table (separate from user_roles, specifically for resources)
CREATE TABLE IF NOT EXISTS public.resource_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role resource_role NOT NULL DEFAULT 'member',
  assigned_sites text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. Create system_settings table for global configurations
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- 6. Create superadmin_audit_log table
CREATE TABLE IF NOT EXISTS public.superadmin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id),
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Create sites table
CREATE TABLE IF NOT EXISTS public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sites text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Create resource_folders table
CREATE TABLE IF NOT EXISTS public.resource_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_name text UNIQUE NOT NULL,
  images text,
  visibility_level visibility_level NOT NULL DEFAULT 'public_members',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Create training_folders table
CREATE TABLE IF NOT EXISTS public.training_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_name text UNIQUE NOT NULL,
  images text,
  visibility_level visibility_level NOT NULL DEFAULT 'public_members',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Create files_repository table
CREATE TABLE IF NOT EXISTS public.files_repository (
  id serial PRIMARY KEY,
  file_name text NOT NULL,
  images text,
  drive_link_download text,
  drive_link_share text,
  description text,
  price_dp text,
  price_srp text,
  unilevel_points numeric,
  folder_name text,
  wholesale_package_commission text,
  package_points_smc text,
  rqv text,
  infinity text,
  check_match text,
  give_me_5 text,
  just_4_you text,
  view_video_url text,
  visibility_level visibility_level NOT NULL DEFAULT 'public_members',
  allowed_sites text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Create directory_entries table
CREATE TABLE IF NOT EXISTS public.directory_entries (
  id serial PRIMARY KEY,
  location text,
  address text,
  maps_link text,
  owner text,
  facebook_page text,
  operating_hours text,
  phone_1 text,
  phone_2 text,
  phone_3 text,
  sites text,
  visibility_level visibility_level NOT NULL DEFAULT 'public_members',
  allowed_sites text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Create ambassadors_library table
CREATE TABLE IF NOT EXISTS public.ambassadors_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_endorsed text,
  endorser text,
  thumbnail text,
  drive_link text,
  drive_share_link text,
  video_file_url text,
  folder_name text,
  visibility_level visibility_level NOT NULL DEFAULT 'public_members',
  allowed_sites text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Create iam_links table
CREATE TABLE IF NOT EXISTS public.iam_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  link text NOT NULL,
  visibility_level visibility_level NOT NULL DEFAULT 'public_members',
  allowed_sites text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Create ways_13 table
CREATE TABLE IF NOT EXISTS public.ways_13 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  visibility_level visibility_level NOT NULL DEFAULT 'public_members',
  allowed_sites text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 15. Create resource_favorites table
CREATE TABLE IF NOT EXISTS public.resource_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_type, resource_id)
);

-- 16. Create resource_events table for analytics
CREATE TABLE IF NOT EXISTS public.resource_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster event queries
CREATE INDEX IF NOT EXISTS idx_resource_events_resource ON public.resource_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_events_user ON public.resource_events(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_events_created ON public.resource_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_favorites_user ON public.resource_favorites(user_id);

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to get user's resource role
CREATE OR REPLACE FUNCTION public.get_resource_role(p_user_id uuid)
RETURNS resource_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.resource_user_roles WHERE user_id = p_user_id),
    'member'::resource_role
  )
$$;

-- Function to check if user is resource super admin
CREATE OR REPLACE FUNCTION public.is_resource_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resource_user_roles 
    WHERE user_id = p_user_id AND role = 'super_admin'
  ) OR is_super_admin(p_user_id)
$$;

-- Function to check if user is resource admin (admin or super_admin)
CREATE OR REPLACE FUNCTION public.is_resource_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resource_user_roles 
    WHERE user_id = p_user_id AND role IN ('admin', 'super_admin')
  ) OR is_super_admin(p_user_id)
$$;

-- Function to check visibility access
CREATE OR REPLACE FUNCTION public.can_view_resource(
  p_user_id uuid,
  p_visibility visibility_level,
  p_allowed_sites text[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role resource_role;
  v_user_sites text[];
  v_lockdown boolean;
BEGIN
  -- Get user's role
  v_role := get_resource_role(p_user_id);
  
  -- Super admin can see everything
  IF v_role = 'super_admin' OR is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Check lockdown mode
  SELECT COALESCE((value->>'enabled')::boolean, false)
  INTO v_lockdown
  FROM system_settings 
  WHERE key = 'lockdown_mode';
  
  -- In lockdown mode, apply strict visibility
  IF v_lockdown THEN
    IF p_visibility = 'public_members' AND v_role IN ('member', 'leader', 'admin') THEN
      RETURN true;
    ELSIF p_visibility = 'leaders_only' AND v_role IN ('leader', 'admin') THEN
      RETURN true;
    ELSIF p_visibility = 'admins_only' AND v_role = 'admin' THEN
      RETURN true;
    ELSE
      RETURN false;
    END IF;
  END IF;
  
  -- Normal visibility rules
  IF p_visibility = 'public_members' THEN
    -- Everyone can see
  ELSIF p_visibility = 'leaders_only' AND v_role NOT IN ('leader', 'admin', 'super_admin') THEN
    RETURN false;
  ELSIF p_visibility = 'admins_only' AND v_role NOT IN ('admin', 'super_admin') THEN
    RETURN false;
  ELSIF p_visibility = 'super_admin_only' THEN
    RETURN false; -- Already handled above
  END IF;
  
  -- Check site restrictions (admins bypass site restrictions)
  IF p_allowed_sites IS NOT NULL AND array_length(p_allowed_sites, 1) > 0 THEN
    IF v_role IN ('admin', 'super_admin') THEN
      RETURN true;
    END IF;
    
    SELECT assigned_sites INTO v_user_sites
    FROM resource_user_roles
    WHERE user_id = p_user_id;
    
    -- Check if there's any overlap
    IF v_user_sites IS NULL OR array_length(v_user_sites, 1) = 0 THEN
      RETURN false;
    END IF;
    
    RETURN v_user_sites && p_allowed_sites;
  END IF;
  
  RETURN true;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.resource_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iam_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ways_13 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_events ENABLE ROW LEVEL SECURITY;

-- resource_user_roles policies
CREATE POLICY "Users can view own role" ON public.resource_user_roles
  FOR SELECT USING (user_id = auth.uid() OR is_resource_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage roles" ON public.resource_user_roles
  FOR ALL USING (is_resource_super_admin(auth.uid()));

-- system_settings policies
CREATE POLICY "Super admins can manage settings" ON public.system_settings
  FOR ALL USING (is_resource_super_admin(auth.uid()));

CREATE POLICY "Authenticated can read settings" ON public.system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- superadmin_audit_log policies
CREATE POLICY "Super admins can view audit log" ON public.superadmin_audit_log
  FOR SELECT USING (is_resource_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert audit log" ON public.superadmin_audit_log
  FOR INSERT WITH CHECK (is_resource_super_admin(auth.uid()));

-- sites policies
CREATE POLICY "Authenticated can view sites" ON public.sites
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage sites" ON public.sites
  FOR ALL USING (is_resource_admin(auth.uid()));

-- resource_folders policies
CREATE POLICY "Authenticated can view folders" ON public.resource_folders
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND (is_active = true OR is_resource_admin(auth.uid()))
    AND can_view_resource(auth.uid(), visibility_level)
  );

CREATE POLICY "Admins can manage folders" ON public.resource_folders
  FOR ALL USING (is_resource_admin(auth.uid()));

-- training_folders policies
CREATE POLICY "Authenticated can view training folders" ON public.training_folders
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND (is_active = true OR is_resource_admin(auth.uid()))
    AND can_view_resource(auth.uid(), visibility_level)
  );

CREATE POLICY "Admins can manage training folders" ON public.training_folders
  FOR ALL USING (is_resource_admin(auth.uid()));

-- files_repository policies
CREATE POLICY "Authenticated can view files" ON public.files_repository
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND (is_active = true OR is_resource_admin(auth.uid()))
    AND can_view_resource(auth.uid(), visibility_level, allowed_sites)
  );

CREATE POLICY "Admins can manage files" ON public.files_repository
  FOR ALL USING (is_resource_admin(auth.uid()));

-- directory_entries policies
CREATE POLICY "Authenticated can view directory" ON public.directory_entries
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND (is_active = true OR is_resource_admin(auth.uid()))
    AND can_view_resource(auth.uid(), visibility_level, allowed_sites)
  );

CREATE POLICY "Admins can manage directory" ON public.directory_entries
  FOR ALL USING (is_resource_admin(auth.uid()));

-- ambassadors_library policies
CREATE POLICY "Authenticated can view ambassadors" ON public.ambassadors_library
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND (is_active = true OR is_resource_admin(auth.uid()))
    AND can_view_resource(auth.uid(), visibility_level, allowed_sites)
  );

CREATE POLICY "Admins can manage ambassadors" ON public.ambassadors_library
  FOR ALL USING (is_resource_admin(auth.uid()));

-- iam_links policies
CREATE POLICY "Authenticated can view links" ON public.iam_links
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND (is_active = true OR is_resource_admin(auth.uid()))
    AND can_view_resource(auth.uid(), visibility_level, allowed_sites)
  );

CREATE POLICY "Admins can manage links" ON public.iam_links
  FOR ALL USING (is_resource_admin(auth.uid()));

-- ways_13 policies
CREATE POLICY "Authenticated can view ways" ON public.ways_13
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND (is_active = true OR is_resource_admin(auth.uid()))
    AND can_view_resource(auth.uid(), visibility_level, allowed_sites)
  );

CREATE POLICY "Admins can manage ways" ON public.ways_13
  FOR ALL USING (is_resource_admin(auth.uid()));

-- resource_favorites policies
CREATE POLICY "Users can manage own favorites" ON public.resource_favorites
  FOR ALL USING (user_id = auth.uid());

-- resource_events policies
CREATE POLICY "Users can insert own events" ON public.resource_events
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can view own events" ON public.resource_events
  FOR SELECT USING (user_id = auth.uid() OR is_resource_admin(auth.uid()));

-- =====================================================
-- Initialize default system settings
-- =====================================================
INSERT INTO public.system_settings (key, value) VALUES
  ('lockdown_mode', '{"enabled": false}'::jsonb),
  ('default_visibility', '{"files": "public_members", "ambassadors": "public_members", "links": "public_members", "ways_13": "public_members", "directory": "public_members"}'::jsonb)
ON CONFLICT (key) DO NOTHING;