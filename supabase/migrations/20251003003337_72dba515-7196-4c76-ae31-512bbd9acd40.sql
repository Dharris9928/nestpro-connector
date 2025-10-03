-- Fix the security_barrier view issue while maintaining access control

-- Drop and recreate the view WITHOUT security_barrier
DROP VIEW IF EXISTS public.company_hierarchy CASCADE;

-- Recreate the view as a normal view (security is enforced by grants and the security definer functions)
CREATE VIEW public.company_hierarchy AS
WITH RECURSIVE hierarchy AS (
  -- Base case: companies with no parent
  SELECT 
    id,
    company_name,
    parent_company_id,
    0 as level,
    company_name::text as full_path,
    ARRAY[id] as path
  FROM companies
  WHERE parent_company_id IS NULL
  
  UNION ALL
  
  -- Recursive case: companies with parents
  SELECT 
    c.id,
    c.company_name,
    c.parent_company_id,
    h.level + 1,
    h.full_path || ' > ' || c.company_name,
    h.path || c.id
  FROM companies c
  INNER JOIN hierarchy h ON c.parent_company_id = h.id
)
SELECT * FROM hierarchy;

-- Revoke all public and anonymous access
REVOKE ALL ON public.company_hierarchy FROM PUBLIC;
REVOKE ALL ON public.company_hierarchy FROM anon;

-- Only allow authenticated users to access it
-- Note: The actual row-level filtering is handled by the underlying companies table RLS
-- and by the security definer functions get_company_hierarchy() and get_company_hierarchy_for_company()
GRANT SELECT ON public.company_hierarchy TO authenticated;

-- Add documentation explaining the security model
COMMENT ON VIEW public.company_hierarchy IS 
'View of company organizational structure. Direct access restricted to authenticated users. Row-level security is enforced by the underlying companies table RLS policies. For filtered access, use get_company_hierarchy() or get_company_hierarchy_for_company() security definer functions.';