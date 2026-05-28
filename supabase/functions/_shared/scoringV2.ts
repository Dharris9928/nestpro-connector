// ============================================================
// SCORING v2.0 — Deno-compatible bundle of the pure scoring
// functions. Mirrors src/lib/scoring/{builder,contractor}Scoring.ts
// for use inside edge functions (which cannot import from src/).
// Keep in sync with the frontend files.
// ============================================================

// ── Builder types ────────────────────────────────────────────
export type BuilderSegment =
  | 'production_tract' | 'regional_mid_volume' | 'spec_home' | 'luxury_custom'
  | 'multi_family' | 'affordable_housing' | 'active_adult_55plus' | 'unknown';
export type GeographicTier =
  | 'sun_belt_tier1' | 'sun_belt_tier2' | 'major_metro_other'
  | 'secondary_market' | 'rural_small' | 'unknown';
export type NestProStatus =
  | 'enrolled_elite' | 'enrolled_standard' | 'purchased_not_enrolled' | 'no_history';
export type SmartHomeReadiness =
  | 'active_program' | 'evaluating' | 'open_no_program' | 'not_interested';
export type WholesalePartnerMatch =
  | 'key_nest_pro_partner' | 'distributor_with_relationship' | 'unknown' | 'non_partner_distributor';
export type ContactAuthority =
  | 'owner_csuite' | 'vp_director' | 'manager' | 'gatekeeper_only' | 'no_contact';

export interface BuilderScoringInput {
  annual_volume: number;
  average_home_price: number;
  segment: BuilderSegment;
  geographic_tier: GeographicTier;
  state: string;
  smart_home_readiness: SmartHomeReadiness;
  wholesale_partner_match: WholesalePartnerMatch;
  nest_pro_status: NestProStatus;
  permits_in_pipeline: number;
  contact_authority: ContactAuthority;
  contact_count_verified: number;
  has_website: boolean;
  website_has_smart_home_content: boolean;
  linkedin_company_active: boolean;
}

// ── Contractor types ─────────────────────────────────────────
export type ContractorSegment =
  | 'smart_home_champion' | 'customer_experience_innovator' | 'premium_service_specialist'
  | 'high_volume_installer' | 'specialty_hvac_integrator' | 'regional_growth_contractor'
  | 'service_first_traditionalist' | 'emergency_repair_focused' | 'unknown';
export type WorkTypeFocus =
  | 'new_construction_dominant' | 'mixed_new_and_service'
  | 'replacement_retrofit_focus' | 'service_maintenance_only' | 'unknown';
export type CompetitorStatus =
  | 'no_smart_home_competitor' | 'evaluating_competitors' | 'resideo_honeywell_dealer'
  | 'ecobee_or_other_dealer' | 'committed_competitor' | 'unknown';
export type TrainingReadiness =
  | 'formal_training_program' | 'informal_occasional' | 'no_training_infrastructure' | 'unknown';
export type TechAdoptionSignal =
  | 'servicetitan_or_equivalent' | 'basic_crm_or_software' | 'paper_based' | 'unknown';
export type ContactTrustLevel =
  | 'established_relationship' | 'neutral_prior_contact' | 'cold_no_prior_contact'
  | 'previous_friction' | 'unknown';

export interface ContractorScoringInput {
  annual_install_units: number;
  estimated_annual_revenue: number;
  service_agreement_count: number;
  segment: ContractorSegment;
  geographic_tier: 'sun_belt_tier1' | 'sun_belt_tier2' | 'major_metro_other' | 'secondary_market' | 'rural_small' | 'unknown';
  state: string;
  work_type_focus: WorkTypeFocus;
  competitor_status: CompetitorStatus;
  smart_home_readiness: 'active_program' | 'considering' | 'open_no_program' | 'not_interested';
  nest_pro_status: 'enrolled_elite' | 'enrolled_standard' | 'purchased_not_enrolled' | 'no_history';
  wholesale_partner_match: 'key_nest_pro_partner' | 'distributor_with_relationship' | 'unknown' | 'non_partner_distributor';
  contact_authority: 'owner_csuite' | 'vp_director' | 'manager' | 'gatekeeper_only' | 'no_contact';
  contact_trust_level: ContactTrustLevel;
  training_readiness: TrainingReadiness;
  tech_adoption_signal: TechAdoptionSignal;
  has_website: boolean;
  website_has_smart_home_content: boolean;
  linkedin_active: boolean;
}

// ── Shared helpers ───────────────────────────────────────────
const SUN_BELT_TIER1 = ['TX','FL','GA','AZ','NC','TN','SC','NV'];
const SUN_BELT_TIER2 = ['CO','VA','UT','AL','MS','LA','OK','AR','KY'];
const MAJOR_METRO    = ['CA','NY','IL','WA','MA','NJ','MD','MN','OR'];

function deriveGeoTier(state: string, provided: GeographicTier): GeographicTier {
  if (provided !== 'unknown') return provided;
  const s = (state || '').toUpperCase().slice(0, 2);
  if (SUN_BELT_TIER1.includes(s)) return 'sun_belt_tier1';
  if (SUN_BELT_TIER2.includes(s)) return 'sun_belt_tier2';
  if (MAJOR_METRO.includes(s)) return 'major_metro_other';
  return 'secondary_market';
}

// ── Builder scoring ──────────────────────────────────────────
export function calculateBuilderScore(input: BuilderScoringInput) {
  const tier = deriveGeoTier(input.state, input.geographic_tier);

  const annual_volume_score =
    input.annual_volume >= 500 ? 12 : input.annual_volume >= 200 ? 10 :
    input.annual_volume >= 100 ? 8 : input.annual_volume >= 50 ? 6 :
    input.annual_volume >= 25 ? 4 : input.annual_volume >= 10 ? 2 : 1;

  const price_point_score =
    input.average_home_price >= 750000 ? 13 : input.average_home_price >= 500000 ? 11 :
    input.average_home_price >= 400000 ? 9 : input.average_home_price >= 300000 ? 7 :
    input.average_home_price >= 200000 ? 5 : input.average_home_price >= 150000 ? 3 : 1;

  const segmentMap: Record<BuilderSegment, number> = {
    luxury_custom: 15, active_adult_55plus: 13, spec_home: 12, regional_mid_volume: 10,
    production_tract: 8, multi_family: 5, affordable_housing: 2, unknown: 3,
  };
  const segment_score = segmentMap[input.segment];

  const geoMap: Record<GeographicTier, number> = {
    sun_belt_tier1: 10, sun_belt_tier2: 8, major_metro_other: 6,
    secondary_market: 4, rural_small: 2, unknown: 2,
  };
  const geographic_score = geoMap[tier];

  const readinessBase: Record<SmartHomeReadiness, number> = {
    active_program: 10, evaluating: 8, open_no_program: 5, not_interested: 0,
  };
  const permitBonus = input.permits_in_pipeline >= 250 ? 2 : input.permits_in_pipeline >= 100 ? 1 : 0;
  const smart_home_readiness_score = Math.min(10, readinessBase[input.smart_home_readiness] + permitBonus);

  const wholesaleMap: Record<WholesalePartnerMatch, number> = {
    key_nest_pro_partner: 8, distributor_with_relationship: 5, unknown: 2, non_partner_distributor: 0,
  };
  const wholesale_partner_score = wholesaleMap[input.wholesale_partner_match];

  const nestProMap: Record<NestProStatus, number> = {
    enrolled_elite: 7, enrolled_standard: 5, purchased_not_enrolled: 3, no_history: 0,
  };
  const nest_pro_status_score = nestProMap[input.nest_pro_status];

  const authMap: Record<ContactAuthority, number> = {
    owner_csuite: 12, vp_director: 9, manager: 5, gatekeeper_only: 2, no_contact: 0,
  };
  const contact_authority_score = authMap[input.contact_authority];

  const contact_depth_score =
    input.contact_count_verified >= 3 ? 8 :
    input.contact_count_verified === 2 ? 6 :
    input.contact_count_verified === 1 ? 3 : 0;

  let digital_score = 0;
  if (input.has_website) digital_score += 2;
  if (input.website_has_smart_home_content) digital_score += 2;
  if (input.linkedin_company_active) digital_score += 1;

  const volume_scale_score = annual_volume_score + price_point_score;
  const market_segment_score = segment_score + geographic_score;
  const nest_program_fit_score = smart_home_readiness_score + wholesale_partner_score + nest_pro_status_score;
  const contact_quality_score = contact_authority_score + contact_depth_score;

  const total_score = Math.min(100,
    volume_scale_score + market_segment_score + nest_program_fit_score +
    contact_quality_score + digital_score
  );

  // Confidence
  let dataPoints = 0;
  if (input.annual_volume > 0) dataPoints++;
  if (input.average_home_price > 0) dataPoints++;
  if (input.segment !== 'unknown') dataPoints++;
  if (tier !== 'unknown' || input.state) dataPoints++;
  if (input.smart_home_readiness) dataPoints++;
  if (input.wholesale_partner_match !== 'unknown') dataPoints++;
  if (input.contact_authority !== 'no_contact') dataPoints++;
  if (input.contact_count_verified > 0) dataPoints++;
  if (input.nest_pro_status !== 'no_history') dataPoints++;
  const confidence: 'High 90%+' | 'Medium 70-89%' | 'Low <70%' =
    dataPoints >= 8 ? 'High 90%+' : dataPoints >= 5 ? 'Medium 70-89%' : 'Low <70%';

  const priority_tier: 'P1' | 'P2' | 'P3' | 'Unscored' =
    total_score >= 75 ? 'P1' : total_score >= 55 ? 'P2' : total_score >= 35 ? 'P3' : 'Unscored';

  const segmentLabels: Record<BuilderSegment, string> = {
    luxury_custom: 'Luxury Custom', active_adult_55plus: 'Active Adult / 55+',
    spec_home: 'Spec Home', regional_mid_volume: 'Regional Mid-Volume',
    production_tract: 'Production / Tract', multi_family: 'Multi-Family',
    affordable_housing: 'Affordable Housing', unknown: 'Unclassified',
  };

  return {
    volume_scale_score, market_segment_score, nest_program_fit_score,
    contact_quality_score, digital_engagement_score: digital_score,
    annual_volume_score, price_point_score, segment_score, geographic_score,
    smart_home_readiness_score, wholesale_partner_score, nest_pro_status_score,
    contact_authority_score, contact_depth_score, digital_score,
    total_score, priority_tier, confidence,
    segment_label: segmentLabels[input.segment],
    key_strengths: [], key_gaps: [],
  };
}

// ── Contractor scoring ───────────────────────────────────────
export function calculateContractorScore(input: ContractorScoringInput) {
  const tier = deriveGeoTier(input.state, input.geographic_tier as GeographicTier);

  const install_volume_score =
    input.annual_install_units >= 1500 ? 10 : input.annual_install_units >= 750 ? 9 :
    input.annual_install_units >= 400 ? 7 : input.annual_install_units >= 200 ? 6 :
    input.annual_install_units >= 100 ? 4 : input.annual_install_units >= 50 ? 3 : 1;

  const revenue_score =
    input.estimated_annual_revenue >= 10_000_000 ? 8 :
    input.estimated_annual_revenue >= 5_000_000 ? 7 :
    input.estimated_annual_revenue >= 2_000_000 ? 5 :
    input.estimated_annual_revenue >= 1_000_000 ? 4 :
    input.estimated_annual_revenue >= 500_000 ? 2 : 1;

  const service_agreement_score =
    input.service_agreement_count >= 1000 ? 7 : input.service_agreement_count >= 500 ? 6 :
    input.service_agreement_count >= 250 ? 5 : input.service_agreement_count >= 100 ? 4 :
    input.service_agreement_count >= 50 ? 2 : 1;

  const segmentMap: Record<ContractorSegment, number> = {
    smart_home_champion: 12, customer_experience_innovator: 11,
    premium_service_specialist: 10, high_volume_installer: 8,
    specialty_hvac_integrator: 8, regional_growth_contractor: 6,
    service_first_traditionalist: 3, emergency_repair_focused: 1, unknown: 2,
  };
  const segment_score = segmentMap[input.segment];

  const geoMap: Record<GeographicTier, number> = {
    sun_belt_tier1: 8, sun_belt_tier2: 6, major_metro_other: 5,
    secondary_market: 3, rural_small: 1, unknown: 2,
  };
  const geographic_score = geoMap[tier];

  const workMap: Record<WorkTypeFocus, number> = {
    new_construction_dominant: 10, mixed_new_and_service: 8,
    replacement_retrofit_focus: 6, service_maintenance_only: 3, unknown: 3,
  };
  const work_type_score = workMap[input.work_type_focus];

  const compMap: Record<CompetitorStatus, number> = {
    no_smart_home_competitor: 10, evaluating_competitors: 7,
    ecobee_or_other_dealer: 5, unknown: 4,
    resideo_honeywell_dealer: 2, committed_competitor: 0,
  };
  const competitor_score = compMap[input.competitor_status];

  const readinessMap: Record<ContractorScoringInput['smart_home_readiness'], number> = {
    active_program: 6, considering: 5, open_no_program: 3, not_interested: 0,
  };
  const smart_home_readiness_score = readinessMap[input.smart_home_readiness];

  const nestMap: Record<ContractorScoringInput['nest_pro_status'], number> = {
    enrolled_elite: 4, enrolled_standard: 3, purchased_not_enrolled: 2, no_history: 0,
  };
  const nest_pro_score = nestMap[input.nest_pro_status];

  const authMap: Record<ContractorScoringInput['contact_authority'], number> = {
    owner_csuite: 8, vp_director: 6, manager: 4, gatekeeper_only: 1, no_contact: 0,
  };
  const contact_authority_score = authMap[input.contact_authority];

  const trustMap: Record<ContactTrustLevel, number> = {
    established_relationship: 7, neutral_prior_contact: 4,
    cold_no_prior_contact: 2, previous_friction: 0, unknown: 2,
  };
  const contact_trust_score_sub = trustMap[input.contact_trust_level];

  const trainMap: Record<TrainingReadiness, number> = {
    formal_training_program: 6, informal_occasional: 4,
    no_training_infrastructure: 1, unknown: 2,
  };
  const training_score = trainMap[input.training_readiness];

  const techMap: Record<TechAdoptionSignal, number> = {
    servicetitan_or_equivalent: 4, basic_crm_or_software: 2, paper_based: 0, unknown: 1,
  };
  const tech_adoption_score = techMap[input.tech_adoption_signal];

  const volume_scale_score = install_volume_score + revenue_score + service_agreement_score;
  const market_segment_score = segment_score + geographic_score;
  const program_fit_score = work_type_score + competitor_score + smart_home_readiness_score + nest_pro_score;
  const contact_trust_score = contact_authority_score + contact_trust_score_sub;
  const training_tech_score = training_score + tech_adoption_score;

  const total_score = Math.min(100,
    volume_scale_score + market_segment_score + program_fit_score +
    contact_trust_score + training_tech_score
  );

  let dataPoints = 0;
  if (input.annual_install_units > 0) dataPoints++;
  if (input.estimated_annual_revenue > 0) dataPoints++;
  if (input.segment !== 'unknown') dataPoints++;
  if (input.work_type_focus !== 'unknown') dataPoints++;
  if (input.competitor_status !== 'unknown') dataPoints++;
  if (input.contact_authority !== 'no_contact') dataPoints++;
  if (input.contact_trust_level !== 'unknown') dataPoints++;
  if (input.training_readiness !== 'unknown') dataPoints++;
  if (input.tech_adoption_signal !== 'unknown') dataPoints++;
  const confidence: 'High 90%+' | 'Medium 70-89%' | 'Low <70%' =
    dataPoints >= 8 ? 'High 90%+' : dataPoints >= 5 ? 'Medium 70-89%' : 'Low <70%';

  const priority_tier: 'P1' | 'P2' | 'P3' | 'Unscored' =
    total_score >= 72 ? 'P1' : total_score >= 52 ? 'P2' : total_score >= 32 ? 'P3' : 'Unscored';

  let program_readiness_stage: 'Ready to Enroll' | 'Needs Education' | 'Long-Term Nurture' | 'Not a Fit';
  if (input.smart_home_readiness === 'active_program' || input.smart_home_readiness === 'considering') {
    program_readiness_stage = total_score >= 60 ? 'Ready to Enroll' : 'Needs Education';
  } else if (input.competitor_status === 'committed_competitor') {
    program_readiness_stage = 'Not a Fit';
  } else if (input.contact_trust_level === 'previous_friction') {
    program_readiness_stage = 'Long-Term Nurture';
  } else {
    program_readiness_stage = total_score >= 45 ? 'Needs Education' : 'Long-Term Nurture';
  }

  const segmentLabels: Record<ContractorSegment, string> = {
    smart_home_champion: 'Smart Home Champion',
    customer_experience_innovator: 'Customer Experience Innovator',
    premium_service_specialist: 'Premium Service Specialist',
    high_volume_installer: 'High-Volume Installer',
    specialty_hvac_integrator: 'Specialty HVAC Integrator',
    regional_growth_contractor: 'Regional Growth Contractor',
    service_first_traditionalist: 'Service-First Traditionalist',
    emergency_repair_focused: 'Emergency / Repair Focused',
    unknown: 'Unclassified',
  };

  return {
    volume_scale_score, market_segment_score, program_fit_score,
    contact_trust_score, training_tech_score,
    install_volume_score, revenue_score, service_agreement_score,
    segment_score, geographic_score, work_type_score, competitor_score,
    smart_home_readiness_score, nest_pro_score,
    contact_authority_score, contact_trust_score_sub,
    training_score, tech_adoption_score,
    total_score, priority_tier, confidence,
    segment_label: segmentLabels[input.segment],
    program_readiness_stage,
    key_strengths: [], key_gaps: [],
  };
}

// ── DB row → input mapping helpers ───────────────────────────
function mapContactAuthority(title?: string | null): ContactAuthority {
  if (!title) return 'no_contact';
  const t = title.toLowerCase();
  if (/owner|ceo|president|founder|co-founder|chief\s/.test(t)) return 'owner_csuite';
  if (/\bvp\b|vice president|director/.test(t)) return 'vp_director';
  if (/manager/.test(t)) return 'manager';
  if (/admin|assistant|coordinator|receptionist|front desk/.test(t)) return 'gatekeeper_only';
  return 'manager';
}

function num(v: any, fb = 0): number {
  if (v == null || v === '') return fb;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : fb;
}

function midRange(r: string | undefined, unitMul: 'K' | 'M' | null = null): number {
  if (!r) return 0;
  if (unitMul) {
    const tokens = r.toUpperCase().match(/(\d+(?:\.\d+)?)([KM])?/g);
    if (!tokens) return 0;
    const nums = tokens.map((t) => {
      const m = t.match(/(\d+(?:\.\d+)?)([KM])?/);
      if (!m) return 0;
      const n = parseFloat(m[1]); const u = m[2];
      return u === 'M' ? n * 1e6 : u === 'K' ? n * 1e3 : n;
    });
    return nums.length === 1 ? nums[0] : Math.round((nums[0] + nums[1]) / 2);
  }
  const m = r.match(/(\d[\d,]*)/g);
  if (!m) return 0;
  const nums = m.map((s) => parseInt(s.replace(/,/g, ''), 10));
  return nums.length === 1 ? nums[0] : Math.round((nums[0] + nums[1]) / 2);
}

function bestContactAuthority(contacts: any[]): { authority: ContactAuthority; count: number } {
  const rank: Record<ContactAuthority, number> = { owner_csuite: 4, vp_director: 3, manager: 2, gatekeeper_only: 1, no_contact: 0 };
  let best: ContactAuthority = 'no_contact';
  for (const c of contacts ?? []) {
    const a = mapContactAuthority(c.title);
    if (rank[a] > rank[best]) best = a;
  }
  return { authority: best, count: (contacts ?? []).length };
}

export function scoreCompanyV2(company: any) {
  const industry = company.industry_type ?? 'Contractor';
  const contacts = company.contacts ?? [];
  const { authority, count } = bestContactAuthority(contacts);

  if (industry === 'Builder') {
    const input: BuilderScoringInput = {
      annual_volume: num(company.annual_volume) || midRange(company.annual_volume_range),
      average_home_price: num(company.average_home_price) || midRange(company.average_home_price_range, 'K'),
      segment: (company.builder_segment as BuilderSegment) ?? 'unknown',
      geographic_tier: (company.geographic_tier as GeographicTier) ?? 'unknown',
      state: company.state ?? '',
      smart_home_readiness: (company.smart_home_readiness as SmartHomeReadiness) ?? 'open_no_program',
      wholesale_partner_match: (company.wholesale_partner_match as WholesalePartnerMatch) ?? 'unknown',
      nest_pro_status: (company.nest_pro_status as NestProStatus) ?? 'no_history',
      permits_in_pipeline: num(company.permits_in_pipeline),
      contact_authority: authority,
      contact_count_verified: count,
      has_website: Boolean(company.website_url),
      website_has_smart_home_content: Boolean(company.website_has_smart_home_content),
      linkedin_company_active: Boolean(company.linkedin_company_url),
    };
    const r = calculateBuilderScore(input);
    return { ...r, industry_type: industry as string };
  }

  const readiness = (company.smart_home_readiness as ContractorScoringInput['smart_home_readiness']) ?? 'open_no_program';
  const normalizedReadiness: ContractorScoringInput['smart_home_readiness'] =
    (readiness as any) === 'evaluating' ? 'considering' : readiness;

  const input: ContractorScoringInput = {
    annual_install_units: num(company.annual_install_units) || num(company.annual_install_volume) || midRange(company.nest_installation_volume_range),
    estimated_annual_revenue: num(company.estimated_annual_revenue) || num(company.annual_revenue) || midRange(company.annual_revenue_range, 'M'),
    service_agreement_count: num(company.service_agreement_count),
    segment: (company.contractor_segment as ContractorSegment) ?? 'unknown',
    geographic_tier: (company.geographic_tier as ContractorScoringInput['geographic_tier']) ?? 'unknown',
    state: company.state ?? '',
    work_type_focus: (company.work_type_focus as WorkTypeFocus) ?? 'unknown',
    competitor_status: (company.competitor_status as CompetitorStatus) ?? 'unknown',
    smart_home_readiness: normalizedReadiness,
    nest_pro_status: (company.nest_pro_status as ContractorScoringInput['nest_pro_status']) ?? 'no_history',
    wholesale_partner_match: (company.wholesale_partner_match as ContractorScoringInput['wholesale_partner_match']) ?? 'unknown',
    contact_authority: authority,
    contact_trust_level: (company.contact_trust_level as ContactTrustLevel) ?? 'unknown',
    training_readiness: (company.training_readiness as TrainingReadiness) ?? 'unknown',
    tech_adoption_signal: (company.tech_adoption_signal as TechAdoptionSignal) ?? 'unknown',
    has_website: Boolean(company.website_url),
    website_has_smart_home_content: Boolean(company.website_has_smart_home_content),
    linkedin_active: Boolean(company.linkedin_company_url),
  };
  const r = calculateContractorScore(input);
  return { ...r, industry_type: industry as string };
}
