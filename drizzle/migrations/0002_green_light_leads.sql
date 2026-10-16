CREATE TABLE public.green_light_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  require_big_project boolean NOT NULL DEFAULT true,
  min_units int NOT NULL DEFAULT 20,
  min_value numeric NOT NULL DEFAULT 1000000,
  require_contact boolean NOT NULL DEFAULT true,
  require_new_contractor boolean NOT NULL DEFAULT true,
  require_territory boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, UPDATE ON public.green_light_settings TO authenticated;
GRANT ALL ON public.green_light_settings TO service_role;
ALTER TABLE public.green_light_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users read green light settings" ON public.green_light_settings FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Admins update green light settings" ON public.green_light_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.green_light_settings (id) VALUES (1);

ALTER TABLE public.building_permits
  ADD COLUMN contractor_was_new boolean NOT NULL DEFAULT false,
  ADD COLUMN green_light boolean NOT NULL DEFAULT false,
  ADD COLUMN green_light_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN green_lit_at timestamptz,
  ADD COLUMN green_light_rep_id uuid REFERENCES public.sales_reps(id) ON DELETE SET NULL,
  ADD COLUMN outreach_status text NOT NULL DEFAULT 'new' CHECK (outreach_status IN ('new','contacted','dismissed'));
CREATE INDEX building_permits_green_light_idx ON public.building_permits (green_lit_at DESC) WHERE green_light;

-- Evaluate a permit row against the current rules (sets fields on the row)
CREATE OR REPLACE FUNCTION public.apply_green_light(p public.building_permits)
RETURNS public.building_permits LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.green_light_settings; rep uuid; reasons text[] := '{}'; ok boolean := true;
BEGIN
  SELECT * INTO s FROM public.green_light_settings WHERE id = 1;
  SELECT id INTO rep FROM public.sales_reps WHERE active AND p.state IS NOT NULL AND p.state = ANY(covered_states) ORDER BY is_firm DESC NULLS LAST, created_at LIMIT 1;
  p.green_light_rep_id := rep;
  IF s IS NULL OR NOT s.enabled THEN p.green_light := false; RETURN p; END IF;
  IF coalesce(p.num_units,0) >= s.min_units OR coalesce(p.estimated_value,0) >= s.min_value THEN reasons := reasons || 'Big project'::text;
  ELSIF s.require_big_project THEN ok := false; END IF;
  IF coalesce(p.applicant_phone,'') <> '' OR coalesce(p.applicant_email,'') <> '' THEN reasons := reasons || 'Contact info'::text;
  ELSIF s.require_contact THEN ok := false; END IF;
  IF p.contractor_was_new THEN reasons := reasons || 'New contractor'::text;
  ELSIF s.require_new_contractor THEN ok := false; END IF;
  IF rep IS NOT NULL THEN reasons := reasons || 'In rep territory'::text;
  ELSIF s.require_territory THEN ok := false; END IF;
  p.green_light := ok AND (s.require_big_project OR s.require_contact OR s.require_new_contractor OR s.require_territory);
  p.green_light_reasons := reasons;
  IF p.green_light AND p.green_lit_at IS NULL THEN p.green_lit_at := now(); END IF;
  IF NOT p.green_light THEN p.green_lit_at := NULL; END IF;
  RETURN p;
END $$;

CREATE OR REPLACE FUNCTION public.green_light_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.data_source = 'shovels' THEN NEW := public.apply_green_light(NEW); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER building_permits_green_light BEFORE INSERT ON public.building_permits FOR EACH ROW EXECUTE FUNCTION public.green_light_before_insert();

-- Notify admins + the territory rep (matched by login email) when a green light lands
CREATE OR REPLACE FUNCTION public.green_light_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE msg text;
BEGIN
  IF NOT NEW.green_light THEN RETURN NEW; END IF;
  msg := coalesce(NEW.builder_name,'A contractor') || ' — ' || coalesce(NEW.num_units::text || ' units, ','') || coalesce(NEW.city || ', ','') || coalesce(NEW.state,'');
  INSERT INTO public.notifications (user_id, type, title, message, link_url, action_required)
  SELECT DISTINCT u, 'green_light_lead', 'Green-light lead ready for outreach', msg, '/instant-outreach', true FROM (
    SELECT ur.user_id u FROM public.user_roles ur WHERE ur.role = 'admin'
    UNION
    SELECT au.id FROM public.sales_reps sr JOIN auth.users au ON lower(au.email) = lower(sr.email) WHERE sr.id = NEW.green_light_rep_id
  ) t;
  RETURN NEW;
END $$;
CREATE TRIGGER building_permits_green_light_notify AFTER INSERT ON public.building_permits FOR EACH ROW EXECUTE FUNCTION public.green_light_notify();

-- Re-score existing Shovels permits after a rules change (no notifications)
CREATE OR REPLACE FUNCTION public.refresh_green_lights()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.building_permits; n int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Admins only'; END IF;
  FOR r IN SELECT * FROM public.building_permits WHERE data_source = 'shovels' LOOP
    r := public.apply_green_light(r);
    UPDATE public.building_permits SET green_light = r.green_light, green_light_reasons = r.green_light_reasons,
      green_lit_at = r.green_lit_at, green_light_rep_id = r.green_light_rep_id WHERE id = r.id;
    IF r.green_light THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_green_lights() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.refresh_green_lights() TO authenticated;

-- Backfill: contractors that were created from a Shovels permit
UPDATE public.building_permits bp SET contractor_was_new = true
FROM public.companies c WHERE bp.builder_company_id = c.id AND bp.data_source = 'shovels'
  AND c.notes LIKE 'Added from Shovels permit ' || coalesce(bp.permit_number, bp.external_id) || '%';
SELECT public.refresh_green_lights();