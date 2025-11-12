-- Add validation constraints to cards table for input security

-- Add length constraints and validation triggers
CREATE OR REPLACE FUNCTION public.validate_card_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- Create trigger to validate card data on insert and update
DROP TRIGGER IF EXISTS validate_card_data_trigger ON public.cards;
CREATE TRIGGER validate_card_data_trigger
  BEFORE INSERT OR UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_card_data();

-- Add similar validation for card_links
CREATE OR REPLACE FUNCTION public.validate_card_link_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- Create trigger for card_links validation
DROP TRIGGER IF EXISTS validate_card_link_data_trigger ON public.card_links;
CREATE TRIGGER validate_card_link_data_trigger
  BEFORE INSERT OR UPDATE ON public.card_links
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_card_link_data();