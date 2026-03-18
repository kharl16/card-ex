
CREATE OR REPLACE FUNCTION public.increment_analytics_daily(
  p_card_id uuid,
  p_day date,
  p_kind text,
  p_ip_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_unique boolean := false;
  v_col text;
BEGIN
  -- Map event kind to column
  v_col := CASE p_kind
    WHEN 'view' THEN 'views'
    WHEN 'qr_scan' THEN 'qr_scans'
    WHEN 'vcard_download' THEN 'vcard_downloads'
    WHEN 'cta_click' THEN 'cta_clicks'
    ELSE NULL
  END;

  IF v_col IS NULL THEN
    RETURN;
  END IF;

  -- Check if this is a unique view (first from this IP today)
  IF p_kind = 'view' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.card_events
      WHERE card_id = p_card_id
        AND kind = 'view'
        AND ip_hash = p_ip_hash
        AND created_at >= p_day::timestamp AT TIME ZONE 'UTC'
        AND created_at < (p_day + 1)::timestamp AT TIME ZONE 'UTC'
        AND id != (
          SELECT id FROM public.card_events
          WHERE card_id = p_card_id AND kind = 'view' AND ip_hash = p_ip_hash
          ORDER BY created_at DESC LIMIT 1
        )
    ) INTO v_is_unique;
  END IF;

  -- Atomic upsert with increment
  INSERT INTO public.analytics_daily (card_id, day, views, unique_views, qr_scans, cta_clicks, vcard_downloads)
  VALUES (
    p_card_id,
    p_day,
    CASE WHEN v_col = 'views' THEN 1 ELSE 0 END,
    CASE WHEN p_kind = 'view' AND v_is_unique THEN 1 ELSE 0 END,
    CASE WHEN v_col = 'qr_scans' THEN 1 ELSE 0 END,
    CASE WHEN v_col = 'cta_clicks' THEN 1 ELSE 0 END,
    CASE WHEN v_col = 'vcard_downloads' THEN 1 ELSE 0 END
  )
  ON CONFLICT (card_id, day) DO UPDATE SET
    views = analytics_daily.views + CASE WHEN v_col = 'views' THEN 1 ELSE 0 END,
    unique_views = analytics_daily.unique_views + CASE WHEN p_kind = 'view' AND v_is_unique THEN 1 ELSE 0 END,
    qr_scans = analytics_daily.qr_scans + CASE WHEN v_col = 'qr_scans' THEN 1 ELSE 0 END,
    cta_clicks = analytics_daily.cta_clicks + CASE WHEN v_col = 'cta_clicks' THEN 1 ELSE 0 END,
    vcard_downloads = analytics_daily.vcard_downloads + CASE WHEN v_col = 'vcard_downloads' THEN 1 ELSE 0 END;
END;
$$;

-- Add unique constraint for atomic upsert (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analytics_daily_card_id_day_key'
  ) THEN
    ALTER TABLE public.analytics_daily ADD CONSTRAINT analytics_daily_card_id_day_key UNIQUE (card_id, day);
  END IF;
END $$;
