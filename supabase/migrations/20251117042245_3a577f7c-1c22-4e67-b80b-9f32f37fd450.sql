-- Fix function_search_path_mutable warning by setting search_path on functions

-- Update sync_full_name() to set search_path
CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- If any name part is provided, assemble full_name
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name = assemble_display_name(
      NEW.prefix,
      NEW.first_name,
      NEW.middle_name,
      NEW.last_name,
      NEW.suffix
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Update handle_new_user() to set search_path (SECURITY DEFINER requires it)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$function$;

-- Update validate_card_data() to set search_path
CREATE OR REPLACE FUNCTION public.validate_card_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate full_name (required, 1-100 chars)
  IF NEW.full_name IS NULL OR LENGTH(TRIM(NEW.full_name)) = 0 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  IF LENGTH(NEW.full_name) > 100 THEN
    RAISE EXCEPTION 'Full name must be 100 characters or less';
  END IF;

  -- Validate optional fields with max lengths
  IF NEW.title IS NOT NULL AND LENGTH(NEW.title) > 100 THEN
    RAISE EXCEPTION 'Title must be 100 characters or less';
  END IF;
  
  IF NEW.company IS NOT NULL AND LENGTH(NEW.company) > 100 THEN
    RAISE EXCEPTION 'Company must be 100 characters or less';
  END IF;
  
  IF NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 500 THEN
    RAISE EXCEPTION 'Bio must be 500 characters or less';
  END IF;
  
  IF NEW.location IS NOT NULL AND LENGTH(NEW.location) > 200 THEN
    RAISE EXCEPTION 'Location must be 200 characters or less';
  END IF;

  -- Validate email format if provided
  IF NEW.email IS NOT NULL AND LENGTH(TRIM(NEW.email)) > 0 THEN
    IF LENGTH(NEW.email) > 255 THEN
      RAISE EXCEPTION 'Email must be 255 characters or less';
    END IF;
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;

  -- Validate phone format if provided (basic validation)
  IF NEW.phone IS NOT NULL AND LENGTH(TRIM(NEW.phone)) > 0 THEN
    IF LENGTH(NEW.phone) > 30 THEN
      RAISE EXCEPTION 'Phone must be 30 characters or less';
    END IF;
  END IF;

  -- Validate website URL if provided
  IF NEW.website IS NOT NULL AND LENGTH(TRIM(NEW.website)) > 0 THEN
    IF LENGTH(NEW.website) > 255 THEN
      RAISE EXCEPTION 'Website must be 255 characters or less';
    END IF;
    -- Prevent javascript: and data: URLs
    IF NEW.website ~* '^(javascript|data|vbscript):' THEN
      RAISE EXCEPTION 'Invalid website URL scheme';
    END IF;
    -- Basic URL validation
    IF NEW.website !~ '^https?://' THEN
      RAISE EXCEPTION 'Website must start with http:// or https://';
    END IF;
  END IF;

  -- Trim whitespace from text fields
  NEW.full_name = TRIM(NEW.full_name);
  NEW.title = TRIM(NEW.title);
  NEW.company = TRIM(NEW.company);
  NEW.bio = TRIM(NEW.bio);
  NEW.location = TRIM(NEW.location);
  NEW.email = TRIM(NEW.email);
  NEW.phone = TRIM(NEW.phone);
  NEW.website = TRIM(NEW.website);

  RETURN NEW;
END;
$function$;

-- Update validate_card_link_data() to set search_path
CREATE OR REPLACE FUNCTION public.validate_card_link_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate label (required, max 100 chars)
  IF NEW.label IS NULL OR LENGTH(TRIM(NEW.label)) = 0 THEN
    RAISE EXCEPTION 'Link label is required';
  END IF;
  IF LENGTH(NEW.label) > 100 THEN
    RAISE EXCEPTION 'Link label must be 100 characters or less';
  END IF;

  -- Validate value (required, max 500 chars)
  IF NEW.value IS NULL OR LENGTH(TRIM(NEW.value)) = 0 THEN
    RAISE EXCEPTION 'Link value is required';
  END IF;
  IF LENGTH(NEW.value) > 500 THEN
    RAISE EXCEPTION 'Link value must be 500 characters or less';
  END IF;

  -- Prevent javascript: and data: URLs in url type links
  IF NEW.kind = 'url' AND NEW.value ~* '^(javascript|data|vbscript):' THEN
    RAISE EXCEPTION 'Invalid URL scheme in link value';
  END IF;

  -- Trim whitespace
  NEW.label = TRIM(NEW.label);
  NEW.value = TRIM(NEW.value);

  RETURN NEW;
END;
$function$;

-- Create table for server-side rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  card_id uuid NOT NULL,
  event_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (ip_hash, card_id)
);

-- Enable RLS on rate_limits (service role will bypass this)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies needed - only edge functions with service role will access this table

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits (ip_hash, card_id, window_start);

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON public.rate_limits (window_start);

-- Create function to clean up old rate limit entries (older than 2 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '2 hours';
END;
$function$;