-- Email recovery is public by design, but it must never return the full email
-- address to an anonymous caller. The UI only needs the masked value.
DROP FUNCTION IF EXISTS public.find_email_by_phone(TEXT, TEXT, TEXT);

CREATE FUNCTION public.find_email_by_phone(
  p_full_name TEXT,
  p_phone_country_code TEXT,
  p_phone_number TEXT
)
RETURNS TABLE (masked_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_phone TEXT := REGEXP_REPLACE(COALESCE(p_phone_number, ''), '[^\d]', '', 'g');
BEGIN
  IF char_length(TRIM(COALESCE(p_full_name, ''))) = 0 OR char_length(v_phone) < 6 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT CONCAT(
    LEFT(SPLIT_PART(p.email, '@', 1), LEAST(3, LENGTH(SPLIT_PART(p.email, '@', 1)))),
    '***@',
    SPLIT_PART(p.email, '@', 2)
  )
  FROM public.profiles AS p
  WHERE LOWER(TRIM(p.full_name)) = LOWER(TRIM(p_full_name))
    AND REGEXP_REPLACE(COALESCE(p.phone_number, ''), '[^\d]', '', 'g') = v_phone
    AND (p_phone_country_code IS NULL OR p.phone_country_code = TRIM(p_phone_country_code))
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_email_by_phone(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_email_by_phone(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
