-- Add binary financial stability indicators (15-point rubric)
ALTER TABLE public.companies
ADD COLUMN revenue_growth_indicators boolean DEFAULT false,
ADD COLUMN multiple_active_projects boolean DEFAULT false,
ADD COLUMN industry_awards_recognition boolean DEFAULT false,
ADD COLUMN positive_reviews_reputation boolean DEFAULT false;

COMMENT ON COLUMN public.companies.revenue_growth_indicators IS 'Evidence of expansion, new markets, increased capacity (5 pts if true)';
COMMENT ON COLUMN public.companies.multiple_active_projects IS 'Multiple active communities/projects running simultaneously (5 pts if true)';
COMMENT ON COLUMN public.companies.industry_awards_recognition IS 'Has received industry awards or recognition (3 pts if true)';
COMMENT ON COLUMN public.companies.positive_reviews_reputation IS 'BBB A- or higher, OR 4+ stars average, OR strong testimonials (2 pts if true)';