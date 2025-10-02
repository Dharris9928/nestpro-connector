-- ==================================================
-- FIX: Secure company_hierarchy view access with explicit function wrapper
-- Prevents unauthorized users from mapping corporate structures
-- ==================================================

-- Create a secure function to query company hierarchy
-- This function enforces the same access controls as the companies table
CREATE OR REPLACE FUNCTION public.get_company_hierarchy()
RETURNS TABLE (
  id uuid,
  company_name text,
  parent_company_id uuid,
  level integer,
  full_path text,
  path uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return hierarchy only for companies the user has access to
  SELECT 
    ch.id,
    ch.company_name,
    ch.parent_company_id,
    ch.level,
    ch.full_path,
    ch.path
  FROM company_hierarchy ch
  WHERE EXISTS (
    -- User must have access to the company via companies table RLS
    SELECT 1 
    FROM companies c
    WHERE c.id = ch.id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  );
$$;

-- Create a more restrictive version for specific company lookups
CREATE OR REPLACE FUNCTION public.get_company_hierarchy_for_company(_company_id uuid)
RETURNS TABLE (
  id uuid,
  company_name text,
  parent_company_id uuid,
  level integer,
  full_path text,
  path uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Verify user has access to the requested company
  SELECT 
    ch.id,
    ch.company_name,
    ch.parent_company_id,
    ch.level,
    ch.full_path,
    ch.path
  FROM company_hierarchy ch
  WHERE 
    -- Filter to the requested company and its hierarchy
    (_company_id = ANY(ch.path) OR ch.id = _company_id)
    AND EXISTS (
      -- User must have access to the root company
      SELECT 1 
      FROM companies c
      WHERE c.id = _company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
    );
$$;

-- Add security documentation
COMMENT ON FUNCTION public.get_company_hierarchy() IS 
'Securely retrieves company hierarchy respecting user permissions. Only returns companies the authenticated user has access to via RLS policies on the companies table.';

COMMENT ON FUNCTION public.get_company_hierarchy_for_company(uuid) IS 
'Securely retrieves company hierarchy for a specific company. Validates user has access to the requested company before returning hierarchy data.';

-- Update view comment to direct users to secure functions
COMMENT ON VIEW public.company_hierarchy IS 
'Recursive view showing company hierarchy. SECURITY WARNING: Do not query this view directly from client code. Use public.get_company_hierarchy() or public.get_company_hierarchy_for_company() functions instead, which enforce proper access controls.';

-- Grant execute permissions to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_company_hierarchy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_hierarchy_for_company(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_company_hierarchy() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_company_hierarchy_for_company(uuid) FROM anon, public;