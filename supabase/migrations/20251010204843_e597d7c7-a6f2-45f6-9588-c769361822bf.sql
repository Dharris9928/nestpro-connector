-- Fix get_encryption_key to call digest correctly
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key TEXT;
  v_session TEXT;
  material TEXT;
BEGIN
  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NOT NULL AND v_key <> '' THEN
    RETURN v_key;
  END IF;

  v_session := current_setting('app.session_id', true);
  IF v_session IS NULL OR v_session = '' THEN
    v_session := extract(epoch from now())::text;
  END IF;

  material := v_session || 'fallback_salt_2025';
  RETURN encode(extensions.digest(convert_to(material, 'UTF8'), 'sha256'), 'hex');
END;
$function$;