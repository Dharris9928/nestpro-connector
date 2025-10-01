-- ==================================================
-- ADD DIGITAL ENGAGEMENT FIELDS & CONVERT TO RANGES
-- ==================================================

-- ============================================
-- DIGITAL ENGAGEMENT FIELDS (NEW)
-- ============================================

-- Website & Online Presence
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS website_quality VARCHAR(20) CHECK (
    website_quality IS NULL OR
    website_quality IN ('Professional', 'Basic', 'Outdated', 'None')
  ),
  ADD COLUMN IF NOT EXISTS website_has_smart_home_content BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_last_updated VARCHAR(20) CHECK (
    website_last_updated IS NULL OR
    website_last_updated IN ('Within 6 months', '6-12 months ago', '1-2 years ago', '2+ years ago', 'Unknown')
  );

-- LinkedIn & Social Media
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS linkedin_followers_range VARCHAR(20) CHECK (
    linkedin_followers_range IS NULL OR
    linkedin_followers_range IN ('10K+', '5K-10K', '1K-5K', '500-1K', '<500', 'No page')
  ),
  ADD COLUMN IF NOT EXISTS linkedin_activity_level VARCHAR(20) CHECK (
    linkedin_activity_level IS NULL OR
    linkedin_activity_level IN ('Very Active', 'Active', 'Moderate', 'Inactive')
  ),
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS social_media_presence VARCHAR(20) CHECK (
    social_media_presence IS NULL OR
    social_media_presence IN ('Strong', 'Moderate', 'Minimal', 'None')
  );

-- Technology Adoption
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS current_smart_home_offerings TEXT[],
  ADD COLUMN IF NOT EXISTS offers_smart_thermostats BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS offers_smart_security BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS offers_home_automation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS technology_adoption_level VARCHAR(20) CHECK (
    technology_adoption_level IS NULL OR
    technology_adoption_level IN ('Industry Leader', 'Early Adopter', 'Mainstream', 'Late Adopter', 'Traditional')
  );

-- Google Nest Specific
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS nest_installation_volume_range VARCHAR(20) CHECK (
    nest_installation_volume_range IS NULL OR
    nest_installation_volume_range IN ('50+/year', '20-49/year', '10-19/year', '5-9/year', '1-4/year', 'None')
  ),
  ADD COLUMN IF NOT EXISTS nest_product_mix TEXT[];

-- Digital Marketing Indicators
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS has_google_business_profile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_review_rating DECIMAL(2,1) CHECK (
    online_review_rating IS NULL OR 
    (online_review_rating >= 0 AND online_review_rating <= 5)
  ),
  ADD COLUMN IF NOT EXISTS online_review_count_range VARCHAR(20) CHECK (
    online_review_count_range IS NULL OR
    online_review_count_range IN ('100+', '50-99', '25-49', '10-24', '<10', 'None')
  );

-- ============================================
-- CONVERT EXACT NUMBERS TO RANGES
-- ============================================

-- Annual Volume Range
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS annual_volume_range VARCHAR(30) CHECK (
    annual_volume_range IS NULL OR
    annual_volume_range IN (
      '1,000+', '500-999', '250-499', '100-249', '50-99', '25-49', '10-24', '5-9', '1-4',
      '10,000+', '5,000-9,999', '3,000-4,999', '2,000-2,999', '1,500-1,999', 
      '1,000-1,499', '750-999', '500-749', '250-499', '100-249', '<100'
    )
  );

-- Average Home Price Range (replacing integer field)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS average_home_price_range VARCHAR(30) CHECK (
    average_home_price_range IS NULL OR
    average_home_price_range IN (
      '$3M+', '$2M-$2.99M', '$1.5M-$1.99M', '$1M-$1.49M', 
      '$800K-$999K', '$600K-$799K', '$500K-$599K', '$400K-$499K', 
      '$300K-$399K', '$250K-$299K', '$200K-$249K', '$150K-$199K', '<$150K'
    )
  );

-- Total Employees Range
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS total_employees_range VARCHAR(20) CHECK (
    total_employees_range IS NULL OR
    total_employees_range IN ('500+', '250-499', '100-249', '50-99', '25-49', '10-24', '5-9', '1-4')
  );

-- Years in Business Range
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS years_in_business_range VARCHAR(20) CHECK (
    years_in_business_range IS NULL OR
    years_in_business_range IN ('30+', '20-29', '15-19', '10-14', '6-9', '3-5', '0-2')
  );

-- ============================================
-- SCORING CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scoring_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  field_name VARCHAR(100) NOT NULL,
  industry_type VARCHAR(20) CHECK (industry_type IN ('Builder', 'Contractor', 'Both')),
  
  range_value VARCHAR(50) NOT NULL,
  score_points INTEGER NOT NULL CHECK (score_points >= 0 AND score_points <= 15),
  
  category VARCHAR(50),
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(field_name, industry_type, range_value)
);

-- Enable RLS on scoring_configuration
ALTER TABLE scoring_configuration ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read scoring configuration
CREATE POLICY "All users can view scoring configuration"
  ON scoring_configuration
  FOR SELECT
  USING (true);

-- Only elevated users can modify scoring configuration
CREATE POLICY "Elevated users can manage scoring configuration"
  ON scoring_configuration
  FOR ALL
  USING (has_elevated_access(auth.uid()));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_website_quality ON companies(website_quality);
CREATE INDEX IF NOT EXISTS idx_companies_linkedin_activity ON companies(linkedin_activity_level);
CREATE INDEX IF NOT EXISTS idx_companies_tech_adoption ON companies(technology_adoption_level);
CREATE INDEX IF NOT EXISTS idx_companies_volume_range ON companies(annual_volume_range);
CREATE INDEX IF NOT EXISTS idx_companies_employees_range ON companies(total_employees_range);