-- Create building_permits table
CREATE TABLE public.building_permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_number TEXT,
  project_name TEXT NOT NULL,
  project_description TEXT,
  num_units INTEGER,
  estimated_value NUMERIC(15, 2),
  builder_name TEXT,
  builder_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  address_line1 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  county TEXT,
  filed_date DATE,
  issued_date DATE,
  status TEXT, -- 'filed', 'under_review', 'issued', 'approved', 'rejected'
  applicant_name TEXT,
  applicant_phone TEXT,
  applicant_email TEXT,
  project_type TEXT, -- 'multi_family', 'single_family', 'mixed_use', 'commercial'
  region TEXT,
  metro_area TEXT,
  data_source TEXT, -- 'perplexity_ai', 'manual_import', 'api'
  is_matched_to_company BOOLEAN DEFAULT false,
  match_confidence INTEGER, -- 0-100
  is_high_value BOOLEAN DEFAULT false,
  notes TEXT,
  search_vector tsvector,
  created_by UUID NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permit_regions table for multi-state regions
CREATE TABLE public.permit_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_name TEXT NOT NULL UNIQUE,
  states TEXT[] NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create metro_areas table
CREATE TABLE public.metro_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metro_name TEXT NOT NULL,
  primary_city TEXT NOT NULL,
  state TEXT NOT NULL,
  included_cities TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permit_scraping_logs table
CREATE TABLE public.permit_scraping_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source TEXT NOT NULL,
  search_params JSONB,
  permits_found INTEGER DEFAULT 0,
  permits_imported INTEGER DEFAULT 0,
  permits_matched INTEGER DEFAULT 0,
  new_companies_created INTEGER DEFAULT 0,
  status TEXT, -- 'success', 'partial', 'failed'
  error_message TEXT,
  created_by UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permit_alerts table
CREATE TABLE public.permit_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.building_permits(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'large_development', 'high_value', 'known_builder', 'target_market'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  message TEXT,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permit_search_schedules table
CREATE TABLE public.permit_search_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_name TEXT NOT NULL,
  search_type TEXT NOT NULL, -- 'region', 'state', 'metro', 'city'
  search_params JSONB NOT NULL,
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  is_active BOOLEAN DEFAULT true,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.building_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metro_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_scraping_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_search_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for building_permits
CREATE POLICY "Users can view all permits" ON public.building_permits
FOR SELECT USING (is_user_approved(auth.uid()));

CREATE POLICY "Users can insert permits" ON public.building_permits
FOR INSERT WITH CHECK (is_user_approved(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Users can update own permits" ON public.building_permits
FOR UPDATE USING (
  is_user_approved(auth.uid()) AND 
  (created_by = auth.uid() OR has_elevated_access(auth.uid()))
);

CREATE POLICY "Elevated access can delete permits" ON public.building_permits
FOR DELETE USING (has_elevated_access(auth.uid()));

-- RLS Policies for permit_regions
CREATE POLICY "Users can view regions" ON public.permit_regions
FOR SELECT USING (is_user_approved(auth.uid()));

CREATE POLICY "Admins can manage regions" ON public.permit_regions
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for metro_areas
CREATE POLICY "Users can view metro areas" ON public.metro_areas
FOR SELECT USING (is_user_approved(auth.uid()));

CREATE POLICY "Admins can manage metro areas" ON public.metro_areas
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for permit_scraping_logs
CREATE POLICY "Users can view all logs" ON public.permit_scraping_logs
FOR SELECT USING (is_user_approved(auth.uid()));

CREATE POLICY "Users can insert logs" ON public.permit_scraping_logs
FOR INSERT WITH CHECK (is_user_approved(auth.uid()) AND created_by = auth.uid());

-- RLS Policies for permit_alerts
CREATE POLICY "Users can view all alerts" ON public.permit_alerts
FOR SELECT USING (is_user_approved(auth.uid()));

CREATE POLICY "Users can acknowledge alerts" ON public.permit_alerts
FOR UPDATE USING (is_user_approved(auth.uid()));

CREATE POLICY "System can create alerts" ON public.permit_alerts
FOR INSERT WITH CHECK (true);

-- RLS Policies for permit_search_schedules
CREATE POLICY "Users can view schedules" ON public.permit_search_schedules
FOR SELECT USING (is_user_approved(auth.uid()));

CREATE POLICY "Elevated access can manage schedules" ON public.permit_search_schedules
FOR ALL USING (has_elevated_access(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_permits_city_state ON public.building_permits(city, state);
CREATE INDEX idx_permits_region ON public.building_permits(region);
CREATE INDEX idx_permits_metro_area ON public.building_permits(metro_area);
CREATE INDEX idx_permits_builder_company_id ON public.building_permits(builder_company_id);
CREATE INDEX idx_permits_filed_date ON public.building_permits(filed_date DESC);
CREATE INDEX idx_permits_num_units ON public.building_permits(num_units);
CREATE INDEX idx_permits_estimated_value ON public.building_permits(estimated_value);
CREATE INDEX idx_permits_is_matched ON public.building_permits(is_matched_to_company);
CREATE INDEX idx_permits_is_high_value ON public.building_permits(is_high_value);
CREATE INDEX idx_permits_search_vector ON public.building_permits USING gin(search_vector);
CREATE INDEX idx_permit_alerts_permit_id ON public.permit_alerts(permit_id);
CREATE INDEX idx_permit_alerts_acknowledged ON public.permit_alerts(is_acknowledged);

-- Full-text search trigger for building_permits
CREATE OR REPLACE FUNCTION public.update_permit_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.project_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.builder_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.project_description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_permits_search_vector
BEFORE INSERT OR UPDATE ON public.building_permits
FOR EACH ROW
EXECUTE FUNCTION public.update_permit_search_vector();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_permits_updated_at
BEFORE UPDATE ON public.building_permits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON public.permit_search_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default regions
INSERT INTO public.permit_regions (region_name, states, description) VALUES
  ('Southwest', ARRAY['AZ', 'NM', 'NV', 'UT'], 'Southwest United States'),
  ('Southeast', ARRAY['FL', 'GA', 'AL', 'SC', 'NC', 'TN', 'MS', 'LA'], 'Southeast United States'),
  ('Pacific Northwest', ARRAY['WA', 'OR', 'ID'], 'Pacific Northwest Region'),
  ('California', ARRAY['CA'], 'California'),
  ('Texas', ARRAY['TX'], 'Texas'),
  ('Northeast', ARRAY['NY', 'NJ', 'PA', 'MA', 'CT', 'RI', 'VT', 'NH', 'ME'], 'Northeast United States'),
  ('Midwest', ARRAY['IL', 'IN', 'MI', 'OH', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'], 'Midwest United States'),
  ('Mountain West', ARRAY['CO', 'WY', 'MT', 'ID', 'UT'], 'Mountain West Region');

-- Seed major metro areas
INSERT INTO public.metro_areas (metro_name, primary_city, state, included_cities) VALUES
  ('Austin Metro', 'Austin', 'TX', ARRAY['Austin', 'Round Rock', 'Georgetown', 'Cedar Park', 'Pflugerville', 'Leander']),
  ('Phoenix Metro', 'Phoenix', 'AZ', ARRAY['Phoenix', 'Scottsdale', 'Mesa', 'Tempe', 'Chandler', 'Glendale', 'Gilbert']),
  ('Dallas-Fort Worth Metro', 'Dallas', 'TX', ARRAY['Dallas', 'Fort Worth', 'Plano', 'Irving', 'Garland', 'Arlington', 'Frisco']),
  ('Las Vegas Metro', 'Las Vegas', 'NV', ARRAY['Las Vegas', 'Henderson', 'North Las Vegas', 'Paradise']),
  ('Denver Metro', 'Denver', 'CO', ARRAY['Denver', 'Aurora', 'Lakewood', 'Thornton', 'Arvada', 'Westminster']),
  ('Atlanta Metro', 'Atlanta', 'GA', ARRAY['Atlanta', 'Sandy Springs', 'Marietta', 'Roswell', 'Johns Creek', 'Alpharetta']),
  ('Miami Metro', 'Miami', 'FL', ARRAY['Miami', 'Fort Lauderdale', 'West Palm Beach', 'Hialeah', 'Pembroke Pines']),
  ('Tampa Metro', 'Tampa', 'FL', ARRAY['Tampa', 'St. Petersburg', 'Clearwater', 'Lakeland']),
  ('Charlotte Metro', 'Charlotte', 'NC', ARRAY['Charlotte', 'Concord', 'Gastonia', 'Rock Hill']),
  ('Nashville Metro', 'Nashville', 'TN', ARRAY['Nashville', 'Murfreesboro', 'Franklin', 'Clarksville']);