-- Fix search path for assemble_display_name function
CREATE OR REPLACE FUNCTION public.assemble_display_name(
  p_prefix text,
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_suffix text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN TRIM(CONCAT_WS(' ',
    NULLIF(p_prefix, ''),
    NULLIF(p_first_name, ''),
    NULLIF(p_middle_name, ''),
    NULLIF(p_last_name, ''),
    CASE 
      WHEN p_suffix IN ('Jr.', 'Sr.', 'II', 'III', 'IV') THEN NULLIF(p_suffix, '')
      WHEN p_suffix IS NOT NULL AND p_suffix != '' THEN ', ' || p_suffix
      ELSE NULL
    END
  ));
END;
$$;

-- Fix search path for sync_full_name function
CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;