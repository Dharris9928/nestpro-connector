-- Fix security definer view issue by enabling security_invoker mode
-- This makes the view respect RLS policies and use the querying user's permissions
DROP VIEW IF EXISTS company_hierarchy;

CREATE OR REPLACE VIEW company_hierarchy 
WITH (security_invoker=on)
AS
WITH RECURSIVE hierarchy AS (
  -- Base case: parent companies (no parent)
  SELECT 
    id,
    company_name,
    parent_company_id,
    0 as level,
    company_name as full_path,
    ARRAY[id] as path
  FROM companies
  WHERE parent_company_id IS NULL
  
  UNION ALL
  
  -- Recursive case: subsidiaries
  SELECT 
    c.id,
    c.company_name,
    c.parent_company_id,
    h.level + 1,
    h.full_path || ' > ' || c.company_name,
    h.path || c.id
  FROM companies c
  INNER JOIN hierarchy h ON c.parent_company_id = h.id
  WHERE NOT c.id = ANY(h.path) -- Prevent infinite loops
)
SELECT * FROM hierarchy;