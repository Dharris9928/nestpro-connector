
-- Cron's main "needs enrichment, ordered by recency" filter
CREATE INDEX IF NOT EXISTS idx_companies_enrichment_pending
  ON public.companies (last_enrichment_attempt_at)
  WHERE builder_segment IS NULL
    AND segment IS NULL
    AND enrichment_skip_reason IS NULL;

-- "Needs enrichment AND has a website" variant
CREATE INDEX IF NOT EXISTS idx_companies_enrichment_pending_with_site
  ON public.companies (id)
  WHERE builder_segment IS NULL
    AND segment IS NULL
    AND enrichment_skip_reason IS NULL
    AND website_url IS NOT NULL
    AND website_url <> '';

-- Generic "builder_segment IS NULL" lookup used by analytics + cron
CREATE INDEX IF NOT EXISTS idx_companies_builder_segment_null
  ON public.companies (id)
  WHERE builder_segment IS NULL;
