
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS enrichment_skip_reason text,
  ADD COLUMN IF NOT EXISTS enrichment_no_segment_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_companies_skip_reason
  ON public.companies (enrichment_skip_reason)
  WHERE enrichment_skip_reason IS NULL;

CREATE INDEX IF NOT EXISTS idx_companies_purge_candidates
  ON public.companies (id)
  WHERE website_url IS NULL OR website_url = '';
