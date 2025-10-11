-- ================================================================
-- PHASE 1 SECURITY ENHANCEMENTS: Session Management, Audit Logging, Field-Level Security
-- ================================================================

-- ================================================================
-- 1. SESSION MANAGEMENT
-- ================================================================

-- Session configuration table
CREATE TABLE IF NOT EXISTS public.session_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idle_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  absolute_timeout_hours INTEGER NOT NULL DEFAULT 8,
  max_concurrent_sessions INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default configuration
INSERT INTO public.session_config (idle_timeout_minutes, absolute_timeout_hours, max_concurrent_sessions)
VALUES (30, 8, 3);

-- User sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token_hash TEXT NOT NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity_at);

-- Enable RLS
ALTER TABLE public.session_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_config
CREATE POLICY "All authenticated users can view session config"
  ON public.session_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage session config"
  ON public.session_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert sessions"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
  ON public.user_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to track user session
CREATE OR REPLACE FUNCTION public.track_user_session(
  _user_id UUID,
  _session_token_hash TEXT,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id UUID;
  config_record RECORD;
  session_count INTEGER;
BEGIN
  -- Get session configuration
  SELECT * INTO config_record FROM public.session_config LIMIT 1;
  
  -- Check if session already exists
  SELECT id INTO session_id
  FROM public.user_sessions
  WHERE user_id = _user_id
    AND session_token_hash = _session_token_hash
    AND expires_at > now();
  
  IF session_id IS NOT NULL THEN
    -- Update existing session
    UPDATE public.user_sessions
    SET last_activity_at = now(),
        expires_at = now() + (config_record.idle_timeout_minutes || ' minutes')::INTERVAL
    WHERE id = session_id;
    
    RETURN session_id;
  END IF;
  
  -- Check concurrent session limit
  SELECT COUNT(*) INTO session_count
  FROM public.user_sessions
  WHERE user_id = _user_id
    AND expires_at > now();
  
  IF session_count >= config_record.max_concurrent_sessions THEN
    -- Terminate oldest session
    DELETE FROM public.user_sessions
    WHERE id = (
      SELECT id FROM public.user_sessions
      WHERE user_id = _user_id
        AND expires_at > now()
      ORDER BY last_activity_at ASC
      LIMIT 1
    );
  END IF;
  
  -- Create new session
  INSERT INTO public.user_sessions (
    user_id,
    session_token_hash,
    ip_address,
    user_agent,
    expires_at
  ) VALUES (
    _user_id,
    _session_token_hash,
    _ip_address,
    _user_agent,
    now() + (config_record.idle_timeout_hours || ' hours')::INTERVAL
  )
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

-- Function to terminate expired sessions
CREATE OR REPLACE FUNCTION public.terminate_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Trigger to force logout on role change
CREATE OR REPLACE FUNCTION public.force_logout_on_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all sessions for user when role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    DELETE FROM public.user_sessions WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_role_change_logout
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.force_logout_on_role_change();

-- Trigger to force logout when account is frozen
CREATE OR REPLACE FUNCTION public.force_logout_on_freeze()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role_frozen = true AND OLD.role_frozen = false THEN
    DELETE FROM public.user_sessions WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_freeze_logout
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.force_logout_on_freeze();

-- ================================================================
-- 2. COMPREHENSIVE AUDIT LOGGING
-- ================================================================

-- Unified audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID,
  operation TEXT NOT NULL CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Authentication events log
CREATE TABLE IF NOT EXISTS public.auth_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET', 'MFA_ENROLLED', 'MFA_VERIFIED')),
  email_attempted TEXT,
  ip_address INET,
  user_agent TEXT,
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_events_user_id ON public.auth_events_log(user_id);
CREATE INDEX idx_auth_events_type ON public.auth_events_log(event_type);
CREATE INDEX idx_auth_events_created_at ON public.auth_events_log(created_at);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_events_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (has_elevated_access(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for auth_events_log
CREATE POLICY "Admins can view all auth events"
  ON public.auth_events_log FOR SELECT
  TO authenticated
  USING (has_elevated_access(auth.uid()));

CREATE POLICY "Users can view their own auth events"
  ON public.auth_events_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert auth events"
  ON public.auth_events_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log authentication events
CREATE OR REPLACE FUNCTION public.log_auth_event(
  _user_id UUID,
  _event_type TEXT,
  _email_attempted TEXT DEFAULT NULL,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _failure_reason TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.auth_events_log (
    user_id,
    event_type,
    email_attempted,
    ip_address,
    user_agent,
    failure_reason,
    metadata
  ) VALUES (
    _user_id,
    _event_type,
    _email_attempted,
    _ip_address,
    _user_agent,
    _failure_reason,
    _metadata
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Trigger function for logging changes
CREATE OR REPLACE FUNCTION public.log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operation_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    operation_type := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    operation_type := 'UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    operation_type := 'DELETE';
  END IF;
  
  INSERT INTO public.audit_logs (
    user_id,
    table_name,
    record_id,
    operation,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    operation_type,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for key tables
CREATE TRIGGER log_companies_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_contacts_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_communications_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.company_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_table_changes();

-- ================================================================
-- 3. FIELD-LEVEL SECURITY
-- ================================================================

-- Field permissions table
CREATE TABLE IF NOT EXISTS public.field_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  min_role_required TEXT NOT NULL CHECK (min_role_required IN ('read_only', 'sales_rep', 'sales_manager', 'admin')),
  is_pii BOOLEAN NOT NULL DEFAULT false,
  masking_pattern TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(table_name, field_name)
);

-- Enable RLS
ALTER TABLE public.field_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view field permissions"
  ON public.field_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage field permissions"
  ON public.field_permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Insert default field permissions
INSERT INTO public.field_permissions (table_name, field_name, min_role_required, is_pii, masking_pattern) VALUES
  ('contacts', 'email', 'sales_rep', true, '***@***.com'),
  ('contacts', 'phone', 'sales_rep', true, '(***) ***-****'),
  ('contacts', 'mobile', 'sales_rep', true, '(***) ***-****'),
  ('contacts', 'email_encrypted', 'sales_rep', true, NULL),
  ('contacts', 'phone_encrypted', 'sales_rep', true, NULL),
  ('contacts', 'mobile_encrypted', 'sales_rep', true, NULL),
  ('companies', 'annual_revenue_range', 'sales_rep', false, '***'),
  ('companies', 'financial_health_rating', 'sales_rep', false, '***'),
  ('companies', 'profitability_level', 'sales_rep', false, '***'),
  ('company_communications', 'content', 'sales_rep', false, '[Content Hidden]');

-- Function to check field access
CREATE OR REPLACE FUNCTION public.can_access_field(
  _user_id UUID,
  _table_name TEXT,
  _field_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  required_role TEXT;
  role_hierarchy TEXT[] := ARRAY['read_only', 'sales_rep', 'sales_manager', 'admin'];
  user_level INTEGER;
  required_level INTEGER;
BEGIN
  -- Get user's role
  SELECT role::TEXT INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get required role for field
  SELECT min_role_required INTO required_role
  FROM public.field_permissions
  WHERE table_name = _table_name
    AND field_name = _field_name;
  
  -- If no permission rule exists, allow access
  IF required_role IS NULL THEN
    RETURN true;
  END IF;
  
  -- Compare role levels
  user_level := array_position(role_hierarchy, user_role);
  required_level := array_position(role_hierarchy, required_role);
  
  RETURN user_level >= required_level;
END;
$$;

-- Function to mask PII field
CREATE OR REPLACE FUNCTION public.mask_pii_field(
  _field_value TEXT,
  _table_name TEXT,
  _field_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  masking_pattern TEXT;
BEGIN
  IF _field_value IS NULL OR _field_value = '' THEN
    RETURN _field_value;
  END IF;
  
  -- Get masking pattern
  SELECT fp.masking_pattern INTO masking_pattern
  FROM public.field_permissions fp
  WHERE fp.table_name = _table_name
    AND fp.field_name = _field_name
    AND fp.is_pii = true;
  
  IF masking_pattern IS NULL THEN
    RETURN _field_value;
  END IF;
  
  -- Apply masking based on field type
  IF _field_name IN ('email', 'primary_email') THEN
    RETURN substring(_field_value, 1, 1) || '***@' || split_part(split_part(_field_value, '@', 2), '.', 1) || '.***';
  ELSIF _field_name IN ('phone', 'mobile', 'primary_phone') THEN
    RETURN '(***) ***-' || right(_field_value, 4);
  ELSE
    RETURN '***';
  END IF;
END;
$$;

-- Create masked contacts view
CREATE OR REPLACE VIEW public.contacts_masked AS
SELECT 
  c.id,
  c.company_id,
  c.branch_id,
  c.first_name,
  c.last_name,
  c.title,
  CASE 
    WHEN can_access_field(auth.uid(), 'contacts', 'email') THEN c.email
    ELSE mask_pii_field(c.email, 'contacts', 'email')
  END AS email,
  CASE 
    WHEN can_access_field(auth.uid(), 'contacts', 'phone') THEN c.phone
    ELSE mask_pii_field(c.phone, 'contacts', 'phone')
  END AS phone,
  CASE 
    WHEN can_access_field(auth.uid(), 'contacts', 'mobile') THEN c.mobile
    ELSE mask_pii_field(c.mobile, 'contacts', 'mobile')
  END AS mobile,
  c.linkedin_url,
  c.decision_tier,
  c.linkedin_connections,
  c.linkedin_activity_score,
  c.preferred_contact_method,
  c.notes,
  c.created_at,
  c.updated_at
FROM public.contacts c;

-- Create masked companies financial view
CREATE OR REPLACE VIEW public.companies_financial_masked AS
SELECT 
  c.id,
  c.company_name,
  c.industry_type,
  CASE 
    WHEN can_access_field(auth.uid(), 'companies', 'annual_revenue_range') THEN c.annual_revenue_range
    ELSE '***'
  END AS annual_revenue_range,
  CASE 
    WHEN can_access_field(auth.uid(), 'companies', 'financial_health_rating') THEN c.financial_health_rating
    ELSE '***'
  END AS financial_health_rating,
  CASE 
    WHEN can_access_field(auth.uid(), 'companies', 'profitability_level') THEN c.profitability_level
    ELSE '***'
  END AS profitability_level,
  c.created_at,
  c.updated_at
FROM public.companies c;