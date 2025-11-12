-- Card-Ex Database Schema
-- Create enum types
CREATE TYPE app_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE link_kind AS ENUM (
  'phone', 'sms', 'email', 'url', 'whatsapp', 'messenger', 
  'telegram', 'viber', 'facebook', 'instagram', 'tiktok', 
  'x', 'youtube', 'linkedin', 'custom'
);
CREATE TYPE event_kind AS ENUM ('view', 'qr_scan', 'vcard_download', 'cta_click', 'unique_view');

-- Update profiles table to add is_super_admin
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Drop and recreate organizations table with proper structure
DROP TABLE IF EXISTS organizations CASCADE;
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  theme_color TEXT DEFAULT '#D4AF37',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop and recreate memberships table
DROP TABLE IF EXISTS memberships CASCADE;
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Update cards table structure
ALTER TABLE cards ADD COLUMN IF NOT EXISTS wallet_pass_url TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS unique_views INTEGER DEFAULT 0;
ALTER TABLE cards ALTER COLUMN theme SET DEFAULT '{"name":"Black&Gold","primary":"#D4AF37","background":"#0B0B0C","text":"#F8F8F8"}'::jsonb;

-- Drop and recreate card_links with new structure
DROP TABLE IF EXISTS card_links CASCADE;
CREATE TABLE card_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  kind link_kind NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  icon TEXT,
  sort_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update card_events with new structure
DROP TABLE IF EXISTS card_events CASCADE;
CREATE TABLE card_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  kind event_kind NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update analytics_daily table
DROP TABLE IF EXISTS analytics_daily CASCADE;
CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  qr_scans INTEGER DEFAULT 0,
  vcard_downloads INTEGER DEFAULT 0,
  cta_clicks INTEGER DEFAULT 0,
  UNIQUE(card_id, day)
);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners and admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- RLS Policies for memberships
CREATE POLICY "Members can view their org memberships"
  ON memberships FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Owners and admins can manage memberships"
  ON memberships FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- RLS Policies for cards (update existing)
DROP POLICY IF EXISTS "Anyone can view published cards" ON cards;
DROP POLICY IF EXISTS "Users can update their own cards" ON cards;

CREATE POLICY "Anyone can view published cards"
  ON cards FOR SELECT
  USING (
    is_published = TRUE 
    OR user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Owners and org admins can update cards"
  ON cards FOR UPDATE
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- RLS Policies for card_links
CREATE POLICY "Anyone can view links for published cards"
  ON card_links FOR SELECT
  USING (
    card_id IN (SELECT id FROM cards WHERE is_published = TRUE)
    OR card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR card_id IN (
      SELECT id FROM cards WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Card owners can manage links"
  ON card_links FOR ALL
  USING (
    card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR card_id IN (
      SELECT id FROM cards WHERE organization_id IN (
        SELECT organization_id FROM memberships 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- RLS Policies for card_events
DROP POLICY IF EXISTS "Anyone can insert events" ON card_events;

CREATE POLICY "Anyone can insert events"
  ON card_events FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Card owners can view events"
  ON card_events FOR SELECT
  USING (
    card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR card_id IN (
      SELECT id FROM cards WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- RLS Policies for analytics_daily
CREATE POLICY "Card owners can view analytics"
  ON analytics_daily FOR SELECT
  USING (
    card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR card_id IN (
      SELECT id FROM cards WHERE organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Card owners can insert analytics"
  ON analytics_daily FOR INSERT
  WITH CHECK (
    card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR TRUE -- Allow system inserts
  );

CREATE POLICY "Card owners can update analytics"
  ON analytics_daily FOR UPDATE
  USING (
    card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
    OR TRUE -- Allow system updates
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON memberships(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_card_links_card ON card_links(card_id, sort_index);
CREATE INDEX IF NOT EXISTS idx_card_events_card ON card_events(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_card_day ON analytics_daily(card_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_org ON cards(organization_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();