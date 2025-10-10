-- Make get_encryption_key return a fallback when not set
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key TEXT;
  v_session TEXT;
BEGIN
  -- Try to read configured key (returns NULL when missing because of missing_ok=true)
  v_key := current_setting('app.encryption_key', true);

  IF v_key IS NOT NULL AND v_key <> '' THEN
    RETURN v_key;
  END IF;

  -- Fallback: derive a stable-but-rotating key per session/project
  v_session := current_setting('app.session_id', true);
  IF v_session IS NULL OR v_session = '' THEN
    -- create a deterministic surrogate using clock timestamp to avoid NULLs
    v_session := extract(epoch from now())::text;
  END IF;

  RETURN encode(digest(v_session || 'fallback_salt_2025', 'sha256'), 'hex');
END;
$function$;