-- Add encryption key rotation function with re-encryption support

CREATE OR REPLACE FUNCTION public.rotate_encryption_key(
  _new_key TEXT,
  _new_version INTEGER,
  _batch_size INTEGER DEFAULT 100
)
RETURNS TABLE(
  contacts_migrated INTEGER,
  companies_migrated INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_key TEXT;
  contact_count INTEGER := 0;
  company_count INTEGER := 0;
  contact_rec RECORD;
  company_rec RECORD;
  performer UUID := auth.uid();
  t_start TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Only admins can rotate keys
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can rotate encryption keys';
  END IF;

  -- Get old key before rotation
  old_key := public.get_encryption_key();

  -- Deactivate old key versions
  UPDATE public.encryption_config SET is_active = false WHERE is_active = true;

  -- Insert new key version
  INSERT INTO public.encryption_config (key_version, is_active, notes)
  VALUES (_new_version, true, 'Key rotated at ' || now()::text);

  -- Store new key in app settings
  PERFORM set_config('app.encryption_key', _new_key, false);

  -- Re-encrypt contacts in batches
  FOR contact_rec IN
    SELECT id FROM public.contacts
    WHERE encryption_version IS NOT NULL
    AND encryption_version < _new_version
    LIMIT _batch_size
  LOOP
    UPDATE public.contacts
    SET
      email_encrypted = CASE
        WHEN email IS NOT NULL AND email != '' THEN public.encrypt_text(email)
        ELSE NULL
      END,
      phone_encrypted = CASE
        WHEN phone IS NOT NULL AND phone != '' THEN public.encrypt_text(phone)
        ELSE NULL
      END,
      mobile_encrypted = CASE
        WHEN mobile IS NOT NULL AND mobile != '' THEN public.encrypt_text(mobile)
        ELSE NULL
      END,
      encryption_version = _new_version
    WHERE id = contact_rec.id;

    contact_count := contact_count + 1;
  END LOOP;

  -- Re-encrypt companies in batches
  FOR company_rec IN
    SELECT id FROM public.companies
    WHERE encryption_version IS NOT NULL
    AND encryption_version < _new_version
    LIMIT _batch_size
  LOOP
    UPDATE public.companies
    SET
      primary_email_encrypted = CASE
        WHEN primary_email IS NOT NULL AND primary_email != '' THEN public.encrypt_text(primary_email)
        ELSE NULL
      END,
      primary_phone_encrypted = CASE
        WHEN primary_phone IS NOT NULL AND primary_phone != '' THEN public.encrypt_text(primary_phone)
        ELSE NULL
      END,
      encryption_version = _new_version
    WHERE id = company_rec.id;

    company_count := company_count + 1;
  END LOOP;

  -- Log the rotation
  INSERT INTO public.encryption_audit_log(
    operation_type, status, table_name, record_count, performed_by, encryption_version, metadata
  ) VALUES (
    'KEY_ROTATION',
    'SUCCESS',
    'all',
    contact_count + company_count,
    performer,
    _new_version,
    jsonb_build_object(
      'contacts_migrated', contact_count,
      'companies_migrated', company_count,
      'batch_size', _batch_size,
      'duration_ms', EXTRACT(EPOCH FROM (now() - t_start)) * 1000
    )
  );

  contacts_migrated := contact_count;
  companies_migrated := company_count;
  status := CASE
    WHEN contact_count + company_count = 0 THEN 'completed'
    ELSE 'in_progress'
  END;
  RETURN NEXT;
END;
$$;

-- Create rotation progress tracking table
CREATE TABLE IF NOT EXISTS public.encryption_rotation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  old_version INTEGER NOT NULL,
  new_version INTEGER NOT NULL,
  total_contacts INTEGER DEFAULT 0,
  migrated_contacts INTEGER DEFAULT 0,
  total_companies INTEGER DEFAULT 0,
  migrated_companies INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  initiated_by UUID
);

ALTER TABLE public.encryption_rotation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage rotation progress"
ON public.encryption_rotation_progress
FOR ALL
USING (has_role(auth.uid(), 'admin'));
