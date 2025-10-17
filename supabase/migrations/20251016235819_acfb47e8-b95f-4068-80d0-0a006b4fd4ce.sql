-- Create field access audit log table
CREATE TABLE IF NOT EXISTS public.field_access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  access_granted BOOLEAN NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.field_access_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view field access logs"
  ON public.field_access_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert field access logs"
  ON public.field_access_audit_log FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_field_access_user_time 
  ON public.field_access_audit_log(user_id, accessed_at DESC);

-- Create security alert acknowledgments table
CREATE TABLE IF NOT EXISTS public.security_alert_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.bulk_access_alerts(id) ON DELETE CASCADE NOT NULL,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE public.security_alert_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert acknowledgments"
  ON public.security_alert_acknowledgments FOR ALL
  USING (has_elevated_access(auth.uid()));

-- Function: Detect excessive access requests
CREATE OR REPLACE FUNCTION public.detect_excessive_access_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count INTEGER;
  threshold INTEGER := 10;
BEGIN
  -- Count requests in last hour
  SELECT COUNT(*) INTO request_count
  FROM public.record_access_requests
  WHERE user_id = NEW.user_id
    AND requested_at > now() - interval '1 hour';
  
  -- Create alert if threshold exceeded
  IF request_count >= threshold THEN
    INSERT INTO public.bulk_access_alerts (
      user_id,
      alert_type,
      record_count,
      table_name,
      alert_details
    ) VALUES (
      NEW.user_id,
      'EXCESSIVE_ACCESS_REQUESTS',
      request_count,
      NEW.table_name,
      jsonb_build_object(
        'requests_per_hour', request_count,
        'threshold', threshold,
        'recent_request_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for excessive access requests
DROP TRIGGER IF EXISTS trigger_detect_excessive_requests ON public.record_access_requests;
CREATE TRIGGER trigger_detect_excessive_requests
  AFTER INSERT ON public.record_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_excessive_access_requests();

-- Function: Log sensitive field access
CREATE OR REPLACE FUNCTION public.log_sensitive_field_access(
  _user_id UUID,
  _table_name TEXT,
  _field_name TEXT,
  _record_id UUID,
  _access_granted BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.field_access_audit_log (
    user_id,
    table_name,
    field_name,
    record_id,
    access_granted,
    accessed_at
  ) VALUES (
    _user_id,
    _table_name,
    _field_name,
    _record_id,
    _access_granted,
    now()
  );
END;
$$;

-- Function: Auto-revoke expired access
CREATE OR REPLACE FUNCTION public.auto_revoke_expired_access()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  DELETE FROM public.record_access_approvals
  WHERE expires_at IS NOT NULL 
    AND expires_at < now();
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Log the revocations
  IF revoked_count > 0 THEN
    RAISE NOTICE 'Auto-revoked % expired access approvals', revoked_count;
  END IF;
  
  RETURN revoked_count;
END;
$$;

-- Function: Notify expiring access
CREATE OR REPLACE FUNCTION public.notify_expiring_access(_days_before INTEGER)
RETURNS TABLE(
  user_id UUID,
  table_name TEXT,
  record_id UUID,
  expires_at TIMESTAMPTZ,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    raa.user_id,
    raa.table_name,
    raa.record_id,
    raa.expires_at,
    EXTRACT(DAY FROM (raa.expires_at - now()))::INTEGER as days_remaining
  FROM public.record_access_approvals raa
  WHERE raa.expires_at IS NOT NULL
    AND raa.expires_at > now()
    AND raa.expires_at < now() + (_days_before || ' days')::INTERVAL
  ORDER BY raa.expires_at ASC;
END;
$$;

-- Function: Detect repeated access denials
CREATE OR REPLACE FUNCTION public.detect_repeated_access_denials(
  _user_id UUID,
  _table_name TEXT,
  _field_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  denial_count INTEGER;
  threshold INTEGER := 5;
BEGIN
  -- Count denials in last hour
  SELECT COUNT(*) INTO denial_count
  FROM public.field_access_audit_log
  WHERE user_id = _user_id
    AND table_name = _table_name
    AND field_name = _field_name
    AND access_granted = false
    AND accessed_at > now() - interval '1 hour';
  
  -- Create alert if threshold exceeded
  IF denial_count >= threshold THEN
    INSERT INTO public.bulk_access_alerts (
      user_id,
      alert_type,
      record_count,
      table_name,
      alert_details
    ) VALUES (
      _user_id,
      'REPEATED_ACCESS_DENIALS',
      denial_count,
      _table_name,
      jsonb_build_object(
        'field_name', _field_name,
        'denials_per_hour', denial_count,
        'threshold', threshold
      )
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicate alerts
  END IF;
END;
$$;