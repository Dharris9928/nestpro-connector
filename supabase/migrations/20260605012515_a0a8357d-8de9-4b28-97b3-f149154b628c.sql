
CREATE TABLE IF NOT EXISTS public.contact_company_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  match_method text NOT NULL,
  match_confidence integer NOT NULL,
  match_signal text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_ccm_status ON public.contact_company_matches(status);
CREATE INDEX IF NOT EXISTS idx_ccm_contact ON public.contact_company_matches(contact_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_company_matches TO authenticated;
GRANT ALL ON public.contact_company_matches TO service_role;

ALTER TABLE public.contact_company_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "elevated_view_all_matches" ON public.contact_company_matches
  FOR SELECT TO authenticated
  USING (public.has_elevated_access(auth.uid()));

CREATE POLICY "elevated_update_matches" ON public.contact_company_matches
  FOR UPDATE TO authenticated
  USING (public.has_elevated_access(auth.uid()));

CREATE POLICY "elevated_delete_matches" ON public.contact_company_matches
  FOR DELETE TO authenticated
  USING (public.has_elevated_access(auth.uid()));

CREATE POLICY "elevated_insert_matches" ON public.contact_company_matches
  FOR INSERT TO authenticated
  WITH CHECK (public.has_elevated_access(auth.uid()));
