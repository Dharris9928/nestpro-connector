-- ==================================================
-- CONVERT ENUMS TO TEXT WITH CHECK CONSTRAINTS
-- ==================================================

-- ============================================
-- STEP 1: ALTER COLUMNS TO TEXT TYPE
-- ============================================

-- Convert builder_segment to TEXT
ALTER TABLE public.companies 
  ALTER COLUMN builder_segment TYPE TEXT;

-- Convert contractor_segment to TEXT  
ALTER TABLE public.companies
  ALTER COLUMN contractor_segment TYPE TEXT;

-- Convert segment_confidence to TEXT
ALTER TABLE public.companies
  ALTER COLUMN segment_confidence TYPE TEXT;

-- ============================================
-- STEP 2: UPDATE EXISTING DATA TO NEW FORMAT
-- ============================================

-- Update builder segments
UPDATE public.companies
SET builder_segment = CASE builder_segment
  WHEN 'Production/Tract Builders' THEN 'production_tract'
  WHEN 'Regional Mid-Volume Builders' THEN 'regional_mid_volume'
  WHEN 'Spec Home Builders' THEN 'spec_home'
  WHEN 'Luxury Custom Builders' THEN 'luxury_custom'
  WHEN 'Multi-Family Developers' THEN 'multi_family'
  WHEN 'Affordable Housing Builders' THEN 'affordable_housing'
  WHEN 'Active Adult/55+ Specialists' THEN 'active_adult'
  ELSE builder_segment
END
WHERE builder_segment IS NOT NULL;

-- Update contractor segments
UPDATE public.companies
SET contractor_segment = CASE contractor_segment
  WHEN 'Smart Home Champions' THEN 'smart_home_champions'
  WHEN 'Customer Experience Innovators' THEN 'customer_experience'
  WHEN 'High-Volume Installers' THEN 'high_volume'
  WHEN 'Premium Service Specialists' THEN 'premium_specialists'
  WHEN 'Regional Growth Contractors' THEN 'regional_growth'
  WHEN 'Specialty HVAC Integrators' THEN 'specialty_integrators'
  WHEN 'Service-First Traditionalists' THEN 'traditionalists'
  WHEN 'Emergency/Repair Specialists' THEN 'emergency_repair'
  ELSE contractor_segment
END
WHERE contractor_segment IS NOT NULL;

-- ============================================
-- STEP 3: ADD CHECK CONSTRAINTS
-- ============================================

ALTER TABLE public.companies
  ADD CONSTRAINT companies_builder_segment_check CHECK (
    builder_segment IS NULL OR 
    builder_segment IN (
      'production_tract',
      'regional_mid_volume',
      'spec_home',
      'luxury_custom',
      'multi_family',
      'affordable_housing',
      'active_adult'
    )
  );

ALTER TABLE public.companies
  ADD CONSTRAINT companies_contractor_segment_check CHECK (
    contractor_segment IS NULL OR
    contractor_segment IN (
      'smart_home_champions',
      'customer_experience',
      'high_volume',
      'premium_specialists',
      'regional_growth',
      'specialty_integrators',
      'traditionalists',
      'emergency_repair'
    )
  );

ALTER TABLE public.companies
  ADD CONSTRAINT companies_segment_confidence_check CHECK (
    segment_confidence IS NULL OR 
    segment_confidence IN ('High 90%+', 'Medium 70-89%', 'Low <70%')
  );

-- ============================================
-- STEP 4: DROP OLD ENUM TYPES
-- ============================================

DROP TYPE IF EXISTS public.builder_segment CASCADE;
DROP TYPE IF EXISTS public.contractor_segment CASCADE;
DROP TYPE IF EXISTS public.segment_confidence CASCADE;

-- ============================================
-- STEP 5: ADD OTHER CONSTRAINTS
-- ============================================

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_price_point_category_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_price_point_category_check CHECK (
    price_point_category IS NULL OR
    price_point_category IN ('Entry-level', 'Mid-range', 'Luxury', 'Ultra-luxury')
  );

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_service_area_type_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_service_area_type_check CHECK (
    service_area_type IS NULL OR
    service_area_type IN ('Local', 'Regional', 'Multi-state', 'National')
  );

-- ============================================
-- STEP 6: ADD MISSING FIELDS
-- ============================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS partner_introduction_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS partner_relationship_status TEXT CHECK (
    partner_relationship_status IS NULL OR
    partner_relationship_status IN ('Matched', 'Introduced', 'Active', 'Inactive')
  ),
  ADD COLUMN IF NOT EXISTS last_contact_date DATE,
  ADD COLUMN IF NOT EXISTS next_activity_date DATE,
  ADD COLUMN IF NOT EXISTS next_activity_type TEXT;

-- ============================================
-- STEP 7: ADD SELF-REFERENCE CONSTRAINT
-- ============================================

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS check_no_self_parent;

ALTER TABLE public.companies
  ADD CONSTRAINT check_no_self_parent CHECK (
    parent_company_id IS NULL OR parent_company_id != id
  );

-- ============================================
-- STEP 8: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_industry ON public.companies(industry_type);
CREATE INDEX IF NOT EXISTS idx_companies_builder_segment ON public.companies(builder_segment);
CREATE INDEX IF NOT EXISTS idx_companies_contractor_segment ON public.companies(contractor_segment);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_score ON public.companies(lead_score);
CREATE INDEX IF NOT EXISTS idx_companies_priority ON public.companies(priority_tier);
CREATE INDEX IF NOT EXISTS idx_companies_state ON public.companies(state);
CREATE INDEX IF NOT EXISTS idx_companies_city ON public.companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_parent ON public.companies(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_companies_last_contact ON public.companies(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_companies_next_activity ON public.companies(next_activity_date);