-- ==================================================
-- FIX: Restrict scoring_configuration access to authenticated users only
-- Remove public read access that exposes proprietary business intelligence
-- ==================================================

-- Drop the insecure public read policy
DROP POLICY IF EXISTS "All users can view scoring configuration" ON public.scoring_configuration;

-- Create secure policy: only authenticated users can read scoring configuration
CREATE POLICY "Authenticated users can view scoring configuration"
ON public.scoring_configuration
FOR SELECT
TO authenticated
USING (true);

-- Keep existing elevated users management policy (already secure)
-- Policy "Elevated users can manage scoring configuration" remains unchanged