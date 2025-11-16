-- Add name component columns to cards table
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS prefix text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS middle_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS suffix text;

-- Create function to assemble display name from name parts
CREATE OR REPLACE FUNCTION public.assemble_display_name(
  p_prefix text,
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_suffix text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
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

-- Create trigger to auto-update full_name from name parts
CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Create trigger before insert or update
DROP TRIGGER IF EXISTS sync_full_name_trigger ON public.cards;
CREATE TRIGGER sync_full_name_trigger
BEFORE INSERT OR UPDATE OF prefix, first_name, middle_name, last_name, suffix
ON public.cards
FOR EACH ROW
EXECUTE FUNCTION sync_full_name();