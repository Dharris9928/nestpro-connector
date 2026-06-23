
-- =============================================================================
-- Performance: STABLE helper functions for repeated RLS ownership checks
-- =============================================================================
-- The previous policies inlined `EXISTS (SELECT 1 FROM companies c WHERE ...)`
-- subqueries that Postgres had to re-evaluate per row. Wrapping the check in a
-- STABLE SECURITY DEFINER SQL function lets the planner cache results within a
-- single query and skip RLS recursion on the lookup table.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_owns_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_elevated_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = _company_id
          AND c.created_by = auth.uid()
      );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_activity(_activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_elevated_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.outreach_activities a
        WHERE a.id = _activity_id
          AND (a.created_by = auth.uid() OR a.assigned_to = auth.uid())
      );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_activity_strict(_activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_elevated_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.outreach_activities a
        WHERE a.id = _activity_id
          AND a.created_by = auth.uid()
      );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_communication(_communication_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_elevated_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.company_communications c
        WHERE c.id = _communication_id
          AND c.user_id = auth.uid()
      );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_company(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_activity(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_activity_strict(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_communication(uuid) TO authenticated, anon;

-- =============================================================================
-- builder_scoring_details
-- =============================================================================
DROP POLICY IF EXISTS "Users can view builder scoring for their companies" ON public.builder_scoring_details;
DROP POLICY IF EXISTS "Users can update builder scoring for their companies" ON public.builder_scoring_details;
DROP POLICY IF EXISTS "Users can insert builder scoring for their companies" ON public.builder_scoring_details;

CREATE POLICY "Users can view builder scoring for their companies"
  ON public.builder_scoring_details FOR SELECT
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can update builder scoring for their companies"
  ON public.builder_scoring_details FOR UPDATE
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can insert builder scoring for their companies"
  ON public.builder_scoring_details FOR INSERT
  WITH CHECK (public.user_owns_company(company_id));

-- =============================================================================
-- contractor_scoring_details
-- =============================================================================
DROP POLICY IF EXISTS "Users can view contractor scoring for their companies" ON public.contractor_scoring_details;
DROP POLICY IF EXISTS "Users can update contractor scoring for their companies" ON public.contractor_scoring_details;
DROP POLICY IF EXISTS "Users can insert contractor scoring for their companies" ON public.contractor_scoring_details;

CREATE POLICY "Users can view contractor scoring for their companies"
  ON public.contractor_scoring_details FOR SELECT
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can update contractor scoring for their companies"
  ON public.contractor_scoring_details FOR UPDATE
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can insert contractor scoring for their companies"
  ON public.contractor_scoring_details FOR INSERT
  WITH CHECK (public.user_owns_company(company_id));

-- =============================================================================
-- company_ai_insights
-- =============================================================================
DROP POLICY IF EXISTS "Users can view AI insights for their companies" ON public.company_ai_insights;
DROP POLICY IF EXISTS "Users can update AI insights for their companies" ON public.company_ai_insights;
DROP POLICY IF EXISTS "Users can create AI insights for their companies" ON public.company_ai_insights;

CREATE POLICY "Users can view AI insights for their companies"
  ON public.company_ai_insights FOR SELECT
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can update AI insights for their companies"
  ON public.company_ai_insights FOR UPDATE
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can create AI insights for their companies"
  ON public.company_ai_insights FOR INSERT
  WITH CHECK (public.user_owns_company(company_id) AND enriched_by = auth.uid());

-- =============================================================================
-- company_branches
-- =============================================================================
DROP POLICY IF EXISTS "Users can view branches for their companies" ON public.company_branches;
DROP POLICY IF EXISTS "Users can update branches for their companies" ON public.company_branches;
DROP POLICY IF EXISTS "Users can create branches for their companies" ON public.company_branches;

CREATE POLICY "Users can view branches for their companies"
  ON public.company_branches FOR SELECT
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can update branches for their companies"
  ON public.company_branches FOR UPDATE
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can create branches for their companies"
  ON public.company_branches FOR INSERT
  WITH CHECK (public.user_owns_company(company_id));

-- =============================================================================
-- company_partner_matches
-- =============================================================================
DROP POLICY IF EXISTS "Users can view partner matches for their companies" ON public.company_partner_matches;
DROP POLICY IF EXISTS "Users can update partner matches for their companies" ON public.company_partner_matches;
DROP POLICY IF EXISTS "Users can create partner matches for their companies" ON public.company_partner_matches;

CREATE POLICY "Users can view partner matches for their companies"
  ON public.company_partner_matches FOR SELECT
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can update partner matches for their companies"
  ON public.company_partner_matches FOR UPDATE
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can create partner matches for their companies"
  ON public.company_partner_matches FOR INSERT
  WITH CHECK (public.user_owns_company(company_id));

-- =============================================================================
-- company_communications (only the two ownership-by-company policies)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view communications for their companies" ON public.company_communications;
DROP POLICY IF EXISTS "Users can update communications for their companies" ON public.company_communications;

CREATE POLICY "Users can view communications for their companies"
  ON public.company_communications FOR SELECT
  USING (public.user_owns_company(company_id));

CREATE POLICY "Users can update communications for their companies"
  ON public.company_communications FOR UPDATE
  USING (public.user_owns_company(company_id));

-- =============================================================================
-- apollo_email_activities
-- =============================================================================
DROP POLICY IF EXISTS "Users can view activities for their companies" ON public.apollo_email_activities;

CREATE POLICY "Users can view activities for their companies"
  ON public.apollo_email_activities FOR SELECT
  USING (public.user_owns_company(company_id));

-- =============================================================================
-- activity_contacts
-- =============================================================================
DROP POLICY IF EXISTS "Users can view activity contacts for their activities" ON public.activity_contacts;
DROP POLICY IF EXISTS "Users can manage activity contacts for their activities" ON public.activity_contacts;

CREATE POLICY "Users can view activity contacts for their activities"
  ON public.activity_contacts FOR SELECT
  USING (public.user_owns_activity(activity_id));

CREATE POLICY "Users can manage activity contacts for their activities"
  ON public.activity_contacts FOR ALL
  USING (public.user_owns_activity_strict(activity_id))
  WITH CHECK (public.user_owns_activity_strict(activity_id));

-- =============================================================================
-- communication_contacts
-- =============================================================================
DROP POLICY IF EXISTS "Users can view communication contacts for their communications" ON public.communication_contacts;
DROP POLICY IF EXISTS "Users can manage communication contacts for their communication" ON public.communication_contacts;

CREATE POLICY "Users can view communication contacts for their communications"
  ON public.communication_contacts FOR SELECT
  USING (public.user_owns_communication(communication_id));

CREATE POLICY "Users can manage communication contacts for their communication"
  ON public.communication_contacts FOR ALL
  USING (public.user_owns_communication(communication_id))
  WITH CHECK (public.user_owns_communication(communication_id));
