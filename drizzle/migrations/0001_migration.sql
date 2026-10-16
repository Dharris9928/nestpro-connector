ALTER TABLE public.building_permits
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS permit_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS permit_type text,
  ADD COLUMN IF NOT EXISTS contractor_license text,
  ADD COLUMN IF NOT EXISTS contractor_website text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS jurisdiction text,
  ADD COLUMN IF NOT EXISTS raw_data jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS building_permits_external_id_key ON public.building_permits(external_id) WHERE external_id IS NOT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS companies_tags_gin ON public.companies USING gin(tags);