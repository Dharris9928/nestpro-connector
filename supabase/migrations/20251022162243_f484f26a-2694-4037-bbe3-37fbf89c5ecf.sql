-- Add buying intent tracking to companies table
ALTER TABLE companies
ADD COLUMN buying_intent_strength TEXT CHECK (buying_intent_strength IN ('none', 'low', 'medium', 'high')),
ADD COLUMN buying_intent_topics TEXT[],
ADD COLUMN buying_intent_last_detected TIMESTAMP WITH TIME ZONE,
ADD COLUMN currently_using_technologies TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN companies.buying_intent_strength IS 'Apollo buying intent signal strength (none/low/medium/high)';
COMMENT ON COLUMN companies.buying_intent_topics IS 'Topics company is actively researching (from Apollo)';
COMMENT ON COLUMN companies.buying_intent_last_detected IS 'When buying intent signals were last detected';
COMMENT ON COLUMN companies.currently_using_technologies IS 'Technologies currently in use (from Apollo)';

-- Create index for faster querying by buying intent
CREATE INDEX idx_companies_buying_intent ON companies(buying_intent_strength) WHERE buying_intent_strength IS NOT NULL;