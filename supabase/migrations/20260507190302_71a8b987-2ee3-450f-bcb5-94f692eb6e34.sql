CREATE INDEX IF NOT EXISTS idx_apollo_email_activities_activity_date_sent
ON public.apollo_email_activities (activity_date, company_id, created_by, apollo_activity_id)
WHERE sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_apollo_email_activities_activity_date_opened
ON public.apollo_email_activities (activity_date, company_id, created_by, apollo_activity_id)
WHERE opened_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_apollo_email_activities_activity_date_replied
ON public.apollo_email_activities (activity_date, company_id, created_by, apollo_activity_id)
WHERE replied_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_communications_sent_at
ON public.company_communications (sent_at, company_id, user_id, communication_type);

CREATE INDEX IF NOT EXISTS idx_outreach_activities_created_completed_scheduled
ON public.outreach_activities (created_at, completed_date, scheduled_date, company_id, created_by, activity_type);

CREATE INDEX IF NOT EXISTS idx_opportunities_created_at_pipeline
ON public.opportunities (created_at, company_id, created_by, assigned_to, assigned_to_sales_rep_id, stage);

CREATE OR REPLACE FUNCTION public.get_apollo_email_metrics(
  _from timestamptz,
  _to timestamptz,
  _perspective text DEFAULT 'all_records',
  _user_id uuid DEFAULT NULL,
  _company_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(sent integer, opened integer, responded integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT COALESCE(a.apollo_activity_id, a.id::text)) FILTER (WHERE a.sent_at IS NOT NULL)::integer AS sent,
    COUNT(DISTINCT COALESCE(a.apollo_activity_id, a.id::text)) FILTER (WHERE a.opened_at IS NOT NULL)::integer AS opened,
    COUNT(DISTINCT COALESCE(a.apollo_activity_id, a.id::text)) FILTER (WHERE a.replied_at IS NOT NULL)::integer AS responded
  FROM public.apollo_email_activities a
  WHERE a.activity_date >= _from
    AND a.activity_date <= _to
    AND (
      _company_ids IS NULL
      OR a.company_id = ANY(_company_ids)
    )
    AND (
      _perspective NOT IN ('my_records', 'assigned_to_me')
      OR _user_id IS NULL
      OR a.created_by = _user_id
    );
$$;