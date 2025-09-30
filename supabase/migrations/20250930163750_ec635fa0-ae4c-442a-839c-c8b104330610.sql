-- Add new fields for franchise companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS franchise_name text,
ADD COLUMN IF NOT EXISTS owner_name text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS nest_pro_industry text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add comment for clarity
COMMENT ON COLUMN public.companies.franchise_name IS 'Name of the franchise brand';
COMMENT ON COLUMN public.companies.owner_name IS 'Owner of the company/franchise';
COMMENT ON COLUMN public.companies.city IS 'City where company is located';
COMMENT ON COLUMN public.companies.nest_pro_industry IS 'Nest Pro industry category';
COMMENT ON COLUMN public.companies.notes IS 'General notes about the company';