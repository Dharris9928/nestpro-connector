-- Fix 1: Assign all orphaned companies to the existing user
UPDATE public.companies 
SET created_by = '5c013a0d-d7c1-4404-8dbc-adcada71ce40'
WHERE created_by IS NULL;

-- Fix 2: Make created_by NOT NULL to enforce data ownership going forward
ALTER TABLE public.companies 
ALTER COLUMN created_by SET NOT NULL;

-- Fix 3: company_hierarchy is a VIEW, not a table
-- Views inherit security from their underlying tables
-- Since it queries the companies table, it will automatically respect
-- the RLS policies on the companies table
-- No action needed for the view itself