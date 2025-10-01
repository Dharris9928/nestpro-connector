-- Drop existing overly permissive RLS policies on contacts table
DROP POLICY IF EXISTS "Authenticated users can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;

-- Create secure RLS policies that restrict access based on company ownership
-- Users can only view contacts for companies they have access to
CREATE POLICY "Users can view contacts for their companies"
ON public.contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contacts.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- Users can only create contacts for companies they have access to
CREATE POLICY "Users can create contacts for their companies"
ON public.contacts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contacts.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- Users can only update contacts for companies they have access to
CREATE POLICY "Users can update contacts for their companies"
ON public.contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contacts.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contacts.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

-- Only elevated users can delete contacts
CREATE POLICY "Elevated users can delete contacts"
ON public.contacts
FOR DELETE
USING (has_elevated_access(auth.uid()));