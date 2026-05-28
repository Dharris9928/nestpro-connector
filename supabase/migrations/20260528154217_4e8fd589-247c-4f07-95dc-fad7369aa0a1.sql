
-- ============================================================
-- SCORING v2.0 — Add new strategic signal columns
-- Existing v1 columns are preserved for historical comparison
-- ============================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS builder_segment text,
  ADD COLUMN IF NOT EXISTS contractor_segment text,
  ADD COLUMN IF NOT EXISTS geographic_tier text,
  ADD COLUMN IF NOT EXISTS smart_home_readiness text,
  ADD COLUMN IF NOT EXISTS wholesale_partner_match text,
  ADD COLUMN IF NOT EXISTS nest_pro_status text,
  ADD COLUMN IF NOT EXISTS permits_in_pipeline integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_agreement_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS work_type_focus text,
  ADD COLUMN IF NOT EXISTS competitor_status text,
  ADD COLUMN IF NOT EXISTS contact_trust_level text,
  ADD COLUMN IF NOT EXISTS training_readiness text,
  ADD COLUMN IF NOT EXISTS tech_adoption_signal text,
  ADD COLUMN IF NOT EXISTS program_readiness_stage text,
  ADD COLUMN IF NOT EXISTS score_breakdown_v2 jsonb;

COMMENT ON COLUMN public.companies.builder_segment IS 'v2.0 scoring: production_tract | regional_mid_volume | spec_home | luxury_custom | multi_family | affordable_housing | active_adult_55plus | unknown';
COMMENT ON COLUMN public.companies.contractor_segment IS 'v2.0 scoring: smart_home_champion | customer_experience_innovator | premium_service_specialist | high_volume_installer | specialty_hvac_integrator | regional_growth_contractor | service_first_traditionalist | emergency_repair_focused | unknown';
COMMENT ON COLUMN public.companies.geographic_tier IS 'v2.0 scoring: sun_belt_tier1 | sun_belt_tier2 | major_metro_other | secondary_market | rural_small | unknown';
COMMENT ON COLUMN public.companies.smart_home_readiness IS 'v2.0 scoring: active_program | evaluating | considering | open_no_program | not_interested';
COMMENT ON COLUMN public.companies.wholesale_partner_match IS 'v2.0 scoring: key_nest_pro_partner | distributor_with_relationship | non_partner_distributor | unknown';
COMMENT ON COLUMN public.companies.nest_pro_status IS 'v2.0 scoring: enrolled_elite | enrolled_standard | purchased_not_enrolled | no_history';
COMMENT ON COLUMN public.companies.permits_in_pipeline IS 'v2.0 scoring (Builder): active permit units in monitoring system';
COMMENT ON COLUMN public.companies.service_agreement_count IS 'v2.0 scoring (Contractor): active service maintenance agreements';
COMMENT ON COLUMN public.companies.work_type_focus IS 'v2.0 scoring (Contractor): new_construction_dominant | mixed_new_and_service | replacement_retrofit_focus | service_maintenance_only | unknown';
COMMENT ON COLUMN public.companies.competitor_status IS 'v2.0 scoring (Contractor): no_smart_home_competitor | evaluating_competitors | resideo_honeywell_dealer | ecobee_or_other_dealer | committed_competitor | unknown';
COMMENT ON COLUMN public.companies.contact_trust_level IS 'v2.0 scoring (Contractor): established_relationship | neutral_prior_contact | cold_no_prior_contact | previous_friction | unknown';
COMMENT ON COLUMN public.companies.training_readiness IS 'v2.0 scoring (Contractor): formal_training_program | informal_occasional | no_training_infrastructure | unknown';
COMMENT ON COLUMN public.companies.tech_adoption_signal IS 'v2.0 scoring (Contractor): servicetitan_or_equivalent | basic_crm_or_software | paper_based | unknown';
COMMENT ON COLUMN public.companies.program_readiness_stage IS 'v2.0 scoring (Contractor outreach routing): Ready to Enroll | Needs Education | Long-Term Nurture | Not a Fit';
COMMENT ON COLUMN public.companies.score_breakdown_v2 IS 'v2.0 scoring: full BuilderScoreBreakdown or ContractorScoreBreakdown JSON, including segment_label, key_strengths, key_gaps';

-- ============================================================
-- Update tier-assignment trigger for channel-specific thresholds
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_assign_priority_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- v2.0 thresholds: builder relationships are longer-cycle but higher LTV,
  -- so builder P1 floor is 75; contractor P1 floor is 72.
  IF NEW.industry_type = 'Builder' THEN
    IF NEW.lead_score >= 75 THEN
      NEW.priority_tier := 'P1';
    ELSIF NEW.lead_score >= 55 THEN
      NEW.priority_tier := 'P2';
    ELSIF NEW.lead_score >= 35 THEN
      NEW.priority_tier := 'P3';
    ELSE
      NEW.priority_tier := 'Unscored';
    END IF;
  ELSE
    -- Contractor, Energy Implementer, Engineer/Architect, Partner/Other
    IF NEW.lead_score >= 72 THEN
      NEW.priority_tier := 'P1';
    ELSIF NEW.lead_score >= 52 THEN
      NEW.priority_tier := 'P2';
    ELSIF NEW.lead_score >= 32 THEN
      NEW.priority_tier := 'P3';
    ELSE
      NEW.priority_tier := 'Unscored';
    END IF;
  END IF;

  NEW.score_calculated_at := NOW();
  RETURN NEW;
END;
$function$;
