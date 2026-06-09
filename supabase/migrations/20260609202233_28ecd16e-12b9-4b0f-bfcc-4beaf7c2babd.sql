CREATE OR REPLACE FUNCTION public.validate_card_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.full_name IS NULL OR LENGTH(TRIM(NEW.full_name)) = 0 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  IF LENGTH(NEW.full_name) > 100 THEN
    RAISE EXCEPTION 'Full name must be 100 characters or less';
  END IF;

  IF NEW.title IS NOT NULL AND LENGTH(NEW.title) > 100 THEN
    RAISE EXCEPTION 'Title must be 100 characters or less';
  END IF;

  IF NEW.company IS NOT NULL AND LENGTH(NEW.company) > 100 THEN
    RAISE EXCEPTION 'Company must be 100 characters or less';
  END IF;

  IF NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 1000 THEN
    RAISE EXCEPTION 'Bio must be 1000 characters or less';
  END IF;

  IF NEW.location IS NOT NULL AND LENGTH(NEW.location) > 200 THEN
    RAISE EXCEPTION 'Location must be 200 characters or less';
  END IF;

  IF NEW.email IS NOT NULL AND LENGTH(TRIM(NEW.email)) > 0 THEN
    IF LENGTH(NEW.email) > 255 THEN
      RAISE EXCEPTION 'Email must be 255 characters or less';
    END IF;
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;

  IF NEW.phone IS NOT NULL AND LENGTH(TRIM(NEW.phone)) > 0 THEN
    IF LENGTH(NEW.phone) > 30 THEN
      RAISE EXCEPTION 'Phone must be 30 characters or less';
    END IF;
  END IF;

  IF NEW.website IS NOT NULL AND LENGTH(TRIM(NEW.website)) > 0 THEN
    IF LENGTH(NEW.website) > 255 THEN
      RAISE EXCEPTION 'Website must be 255 characters or less';
    END IF;
    IF NEW.website ~* '^(javascript|data|vbscript):' THEN
      RAISE EXCEPTION 'Invalid website URL scheme';
    END IF;
    IF NEW.website !~ '^https?://' THEN
      RAISE EXCEPTION 'Website must start with http:// or https://';
    END IF;
  END IF;

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