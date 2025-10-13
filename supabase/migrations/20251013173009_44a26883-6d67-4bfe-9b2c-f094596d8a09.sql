-- Vulnerability Management Tables

-- Security patches tracking
CREATE TABLE IF NOT EXISTS public.security_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_name TEXT NOT NULL,
  patch_type TEXT NOT NULL CHECK (patch_type IN ('dependency', 'code', 'configuration', 'infrastructure')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description TEXT,
  affected_components TEXT[],
  patch_version TEXT,
  applied_at TIMESTAMP WITH TIME ZONE,
  applied_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'verified', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vulnerability scans tracking
CREATE TABLE IF NOT EXISTS public.vulnerability_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL CHECK (scan_type IN ('dependency', 'code', 'penetration', 'configuration')),
  scan_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by UUID REFERENCES auth.users(id),
  findings_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  report_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Security test log
CREATE TABLE IF NOT EXISTS public.security_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('authentication', 'authorization', 'encryption', 'injection', 'xss', 'csrf', 'other')),
  test_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tested_by UUID REFERENCES auth.users(id),
  result TEXT NOT NULL CHECK (result IN ('passed', 'failed', 'warning')),
  description TEXT,
  findings TEXT,
  remediation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
CREATE POLICY "Admins can view security patches"
  ON public.security_patches FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage security patches"
  ON public.security_patches FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view vulnerability scans"
  ON public.vulnerability_scans FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage vulnerability scans"
  ON public.vulnerability_scans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view security tests"
  ON public.security_tests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage security tests"
  ON public.security_tests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_security_patches_status ON public.security_patches(status);
CREATE INDEX idx_security_patches_severity ON public.security_patches(severity);
CREATE INDEX idx_vulnerability_scans_date ON public.vulnerability_scans(scan_date DESC);
CREATE INDEX idx_security_tests_date ON public.security_tests(test_date DESC);

-- Update timestamp trigger
CREATE TRIGGER update_security_patches_updated_at
  BEFORE UPDATE ON public.security_patches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();