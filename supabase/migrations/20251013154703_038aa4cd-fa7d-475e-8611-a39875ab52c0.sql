-- Create consent management table
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'marketing_emails', 'analytics', 'data_sharing', etc.
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  version TEXT NOT NULL DEFAULT '1.0', -- Track consent version for compliance
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own consents
CREATE POLICY "Users can view their own consents"
  ON public.user_consents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own consents"
  ON public.user_consents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own consents"
  ON public.user_consents FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all consents
CREATE POLICY "Admins can view all consents"
  ON public.user_consents FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create data export requests table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  request_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'specific_tables'
  tables_requested TEXT[],
  export_url TEXT, -- Signed URL to download the export
  expires_at TIMESTAMPTZ, -- When the download link expires
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  file_size_bytes BIGINT,
  record_count JSONB, -- Count of records per table
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own export requests
CREATE POLICY "Users can view their own export requests"
  ON public.data_export_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create export requests"
  ON public.data_export_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all export requests
CREATE POLICY "Admins can view all export requests"
  ON public.data_export_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create PII inventory table for data mapping
CREATE TABLE IF NOT EXISTS public.pii_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  pii_category TEXT NOT NULL, -- 'email', 'phone', 'address', 'name', 'financial', etc.
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  encryption_method TEXT,
  retention_period_days INTEGER,
  legal_basis TEXT, -- GDPR legal basis: 'consent', 'contract', 'legitimate_interest', etc.
  purpose TEXT, -- Why we collect this data
  can_be_exported BOOLEAN NOT NULL DEFAULT true,
  can_be_deleted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(table_name, column_name)
);

-- Enable RLS
ALTER TABLE public.pii_inventory ENABLE ROW LEVEL SECURITY;

-- Only admins can manage PII inventory
CREATE POLICY "Admins can manage PII inventory"
  ON public.pii_inventory FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can view PII inventory
CREATE POLICY "Authenticated users can view PII inventory"
  ON public.pii_inventory FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert initial PII inventory data
INSERT INTO public.pii_inventory (table_name, column_name, data_type, pii_category, is_encrypted, encryption_method, legal_basis, purpose, retention_period_days) VALUES
  ('contacts', 'email', 'text', 'email', true, 'AES-256', 'legitimate_interest', 'Business communication and CRM', 2555),
  ('contacts', 'phone', 'text', 'phone', true, 'AES-256', 'legitimate_interest', 'Business communication', 2555),
  ('contacts', 'mobile', 'text', 'phone', true, 'AES-256', 'legitimate_interest', 'Business communication', 2555),
  ('contacts', 'first_name', 'text', 'name', false, NULL, 'legitimate_interest', 'Contact identification', 2555),
  ('contacts', 'last_name', 'text', 'name', false, NULL, 'legitimate_interest', 'Contact identification', 2555),
  ('companies', 'primary_email', 'text', 'email', true, 'AES-256', 'legitimate_interest', 'Business communication', 2555),
  ('companies', 'primary_phone', 'text', 'phone', true, 'AES-256', 'legitimate_interest', 'Business communication', 2555),
  ('companies', 'address_line1', 'text', 'address', false, NULL, 'legitimate_interest', 'Service delivery and communication', 2555),
  ('companies', 'city', 'text', 'address', false, NULL, 'legitimate_interest', 'Service delivery', 2555),
  ('companies', 'state', 'text', 'address', false, NULL, 'legitimate_interest', 'Service delivery', 2555),
  ('companies', 'zip', 'text', 'address', false, NULL, 'legitimate_interest', 'Service delivery', 2555),
  ('profiles', 'first_name', 'text', 'name', false, NULL, 'contract', 'User account management', 2555),
  ('profiles', 'last_name', 'text', 'name', false, NULL, 'contract', 'User account management', 2555)
ON CONFLICT (table_name, column_name) DO NOTHING;

-- Create function to track consent changes
CREATE OR REPLACE FUNCTION public.log_consent_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.granted = true AND (OLD.granted IS NULL OR OLD.granted = false) THEN
    NEW.granted_at := NOW();
    NEW.revoked_at := NULL;
  ELSIF NEW.granted = false AND OLD.granted = true THEN
    NEW.revoked_at := NOW();
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for consent tracking
DROP TRIGGER IF EXISTS track_consent_changes ON public.user_consents;
CREATE TRIGGER track_consent_changes
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_consent_change();

-- Create trigger for updated_at on data export requests
CREATE TRIGGER update_data_export_requests_updated_at
  BEFORE UPDATE ON public.data_export_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on pii_inventory
CREATE TRIGGER update_pii_inventory_updated_at
  BEFORE UPDATE ON public.pii_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();