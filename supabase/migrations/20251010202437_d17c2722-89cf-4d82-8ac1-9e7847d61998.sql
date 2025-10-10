-- Ensure pgcrypto is installed in public schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Revert to using unqualified encrypt/decrypt which live in the public schema
CREATE OR REPLACE FUNCTION public.encrypt_text(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key TEXT;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  
  encryption_key := public.get_encryption_key();
  
  RETURN encode(
    encrypt(
      plain_text::bytea,
      encryption_key::bytea,
      'aes'::text
    ),
    'base64'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_text(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  
  encryption_key := public.get_encryption_key();
  
  RETURN convert_from(
    decrypt(
      decode(encrypted_text, 'base64'),
      encryption_key::bytea,
      'aes'::text
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Decryption failed for encrypted text: %', SQLERRM;
    RETURN '[ENCRYPTED]';
END;
$function$;