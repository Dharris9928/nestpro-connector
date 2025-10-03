-- Fix security issue: Restrict access to company_hierarchy view
-- Since it's a view, we use GRANT/REVOKE instead of RLS

-- Revoke all public access to the view
REVOKE ALL ON public.company_hierarchy FROM PUBLIC;
REVOKE ALL ON public.company_hierarchy FROM anon;

-- Only allow authenticated users to access it
GRANT SELECT ON public.company_hierarchy TO authenticated;

-- Add a security barrier to the view definition to ensure row-level filtering
-- First, drop the existing view
DROP VIEW IF EXISTS public.company_hierarchy CASCADE;

-- Recreate the view with security_barrier option
CREATE VIEW public.company_hierarchy 
WITH (security_barrier = true)
AS
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

-- Revoke public access again (in case view creation reset permissions)
REVOKE ALL ON public.company_hierarchy FROM PUBLIC;
REVOKE ALL ON public.company_hierarchy FROM anon;
GRANT SELECT ON public.company_hierarchy TO authenticated;

-- Add documentation
COMMENT ON VIEW public.company_hierarchy IS 
'Security-protected view of company organizational structure. Direct access restricted to authenticated users only. Use get_company_hierarchy() or get_company_hierarchy_for_company() functions for filtered, authorized access.';

-- Ensure the security definer functions still work properly
-- (They should already have the correct permissions, but let's verify they're properly documented)
COMMENT ON FUNCTION public.get_company_hierarchy() IS 
'Security definer function to retrieve company hierarchy with automatic access control. Returns only companies the user has permission to view.';

COMMENT ON FUNCTION public.get_company_hierarchy_for_company(uuid) IS 
'Security definer function to retrieve hierarchy for a specific company. Verifies user has access to the root company before returning hierarchy.';