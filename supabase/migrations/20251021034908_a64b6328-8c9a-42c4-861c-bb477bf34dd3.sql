-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own opportunities - with company validatio" ON opportunities;

-- Create new policy that allows elevated users to see all opportunities
-- Regular users can only see opportunities they created, are assigned to, or for companies they have access to
CREATE POLICY "Users can view opportunities based on role and access"
ON opportunities
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Elevated users (admin, sales_manager) can see ALL opportunities
    has_elevated_access(auth.uid())
    OR
    -- Regular users can see opportunities they created
    created_by = auth.uid()
    OR
    -- Regular users can see opportunities assigned to them
    assigned_to = auth.uid()
    OR
    -- Regular users can see opportunities for companies they have access to
    (EXISTS (
      SELECT 1
      FROM companies c
      WHERE c.id = opportunities.company_id
      AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid())
    ))
  )
);