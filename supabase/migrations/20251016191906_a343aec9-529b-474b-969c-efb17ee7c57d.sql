-- Phase 3: Remove nest_pro_partners table (no data migration needed - table is empty)

-- Drop foreign key constraint from company_partner_matches
ALTER TABLE IF EXISTS public.company_partner_matches 
DROP CONSTRAINT IF EXISTS company_partner_matches_partner_id_fkey;

-- Drop the partner_id column from company_partner_matches since it references the table we're removing
ALTER TABLE IF EXISTS public.company_partner_matches 
DROP COLUMN IF EXISTS partner_id;

-- Drop RLS policies on nest_pro_partners
DROP POLICY IF EXISTS "Authenticated users can view nest pro partners" ON public.nest_pro_partners;
DROP POLICY IF EXISTS "Elevated users can manage nest pro partners" ON public.nest_pro_partners;

-- Drop the nest_pro_partners table
DROP TABLE IF EXISTS public.nest_pro_partners;

-- Note: Partner information is now stored directly on companies table via fields like:
-- - nest_pro_partner_id
-- - partner_introduction_date
-- - partner_relationship_status
-- This consolidates partner data into the main company profile