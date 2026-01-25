-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule daily backfill of missing referrals at 2:00 AM UTC
SELECT cron.schedule(
  'backfill-missing-referrals-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lorowpouhpjjxembvwyi.supabase.co/functions/v1/backfill-missing-referrals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvcm93cG91aHBqanhlbWJ2d3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NzQ5MDAsImV4cCI6MjA3ODI1MDkwMH0.UNGqjitdE64q2Wm25yLTQsQCf2avGRdZC9IWy4fLIQ8"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);