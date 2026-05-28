// ============================================================
// CONTRACTOR LEAD SCORING - Google Nest Pro Channel CRM
// Version 2.0 — Segment-Aware Algorithm
// ============================================================
// Reflects: 7 contractor behavioral segments, competitive
// threat detection (Resideo/Honeywell), work-type weighting,
// service agreement base, training readiness, and
// technology adoption signals.
//
// Core principle: "First, make them successful. Then, make
// them advocates." Score reflects program-fit readiness,
// not just size.
// ============================================================

export type ContractorSegment =
  | 'smart_home_champion'         // Already advocates or close to it
  | 'customer_experience_innovator' // Differentiates on service, tech-open
  | 'premium_service_specialist'  // High-end residential, premium customers
  | 'high_volume_installer'       // Scale over per-unit value
  | 'specialty_hvac_integrator'   // Technical depth, integration-focused
  | 'regional_growth_contractor'  // Expanding, growth mindset
  | 'service_first_traditionalist' // Skeptical of new programs, trust-driven
  | 'emergency_repair_focused'    // Mostly emergency/reactive, lower fit
  | 'unknown';

export type WorkTypeFocus =
  | 'new_construction_dominant'   // 70%+ new construction
  | 'mixed_new_and_service'       // 40-70% new construction
  | 'replacement_retrofit_focus'  // Mostly replacement work
  | 'service_maintenance_only'    // Primarily service calls
  | 'unknown';

export type CompetitorStatus =
  | 'no_smart_home_competitor'    // Open field — ideal
  | 'evaluating_competitors'      // Shopping around, timing matters
  | 'resideo_honeywell_dealer'    // Our biggest threat
  | 'ecobee_or_other_dealer'      // Manageable
  | 'committed_competitor'        // Locked in
  | 'unknown';

export type TrainingReadiness =
  | 'formal_training_program'     // Has structured tech training
  | 'informal_occasional'         // Some training, no structure
  | 'no_training_infrastructure'  // Reactive, on-the-job only
  | 'unknown';

export type TechAdoptionSignal =
  | 'servicetitan_or_equivalent'  // ServiceTitan, FieldEdge, Housecall Pro
  | 'basic_crm_or_software'
  | 'paper_based'
  | 'unknown';

export type ContactTrustLevel =
  | 'established_relationship'    // Multiple positive interactions, warm
  | 'neutral_prior_contact'       // Had contact, no strong signal
  | 'cold_no_prior_contact'
  | 'previous_friction'           // Product discontinuation concerns, etc.
  | 'unknown';

export interface ContractorScoringInput {
  // Volume & Business Scale (25 pts)
  annual_install_units: number;         // HVAC, electrical units installed/year
  estimated_annual_revenue: number;     // USD
  service_agreement_count: number;      // Active maintenance agreements

  // Market & Segment Fit (20 pts)
  segment: ContractorSegment;
  geographic_tier: 'sun_belt_tier1' | 'sun_belt_tier2' | 'major_metro_other' | 'secondary_market' | 'rural_small' | 'unknown';
  state: string;

  // Program Fit — most strategically weighted (30 pts)
  work_type_focus: WorkTypeFocus;
  competitor_status: CompetitorStatus;
  smart_home_readiness: 'active_program' | 'considering' | 'open_no_program' | 'not_interested';
  nest_pro_status: 'enrolled_elite' | 'enrolled_standard' | 'purchased_not_enrolled' | 'no_history';
  wholesale_partner_match: 'key_nest_pro_partner' | 'distributor_with_relationship' | 'unknown' | 'non_partner_distributor';

  // Contact Quality & Trust (15 pts)
  contact_authority: 'owner_csuite' | 'vp_director' | 'manager' | 'gatekeeper_only' | 'no_contact';
  contact_trust_level: ContactTrustLevel;

  // Training & Technology Readiness (10 pts)
  training_readiness: TrainingReadiness;
  tech_adoption_signal: TechAdoptionSignal;

  // Digital signals
  has_website: boolean;
  website_has_smart_home_content: boolean;
  linkedin_active: boolean;
}

export interface ContractorScoreBreakdown {
  // Category scores
  volume_scale_score: number;       // 0-25
  market_segment_score: number;     // 0-20
  program_fit_score: number;        // 0-30
  contact_trust_score: number;      // 0-15
  training_tech_score: number;      // 0-10

  // Sub-scores
  install_volume_score: number;     // 0-10
  revenue_score: number;            // 0-8
  service_agreement_score: number;  // 0-7
  segment_score: number;            // 0-12
  geographic_score: number;         // 0-8
  work_type_score: number;          // 0-10
  competitor_score: number;         // 0-10
  smart_home_readiness_score: number; // 0-6
  nest_pro_score: number;           // 0-4
  contact_authority_score: number;  // 0-8
  contact_trust_score_sub: number;  // 0-7
  training_score: number;           // 0-6
  tech_adoption_score: number;      // 0-4

  // Totals
  total_score: number;
  priority_tier: 'P1' | 'P2' | 'P3' | 'Unscored';
  confidence: 'High 90%+' | 'Medium 70-89%' | 'Low <70%';
  segment_label: string;
  program_readiness_stage: 'Ready to Enroll' | 'Needs Education' | 'Long-Term Nurture' | 'Not a Fit';
  key_strengths: string[];
  key_gaps: string[];
}

// ── CATEGORY 1: VOLUME & BUSINESS SCALE (25 pts) ────────────

function scoreInstallVolume(units: number): number {
  if (units >= 1500) return 10;
  if (units >= 750)  return 9;
  if (units >= 400)  return 7;
  if (units >= 200)  return 6;
  if (units >= 100)  return 4;
  if (units >= 50)   return 3;
  return 1;
}

function scoreContractorRevenue(revenue: number): number {
  if (revenue >= 10000000) return 8;
  if (revenue >= 5000000)  return 7;
  if (revenue >= 2000000)  return 5;
  if (revenue >= 1000000)  return 4;
  if (revenue >= 500000)   return 2;
  return 1;
}

function scoreServiceAgreements(count: number): number {
  // Service agreement base = captive audience for Nest consultation
  // This is a high-value signal — customers with agreements are
  // repeat touchpoints and smart home upsell opportunities
  if (count >= 1000) return 7;
  if (count >= 500)  return 6;
  if (count >= 250)  return 5;
  if (count >= 100)  return 4;
  if (count >= 50)   return 2;
  return 1;
}

// ── CATEGORY 2: MARKET & SEGMENT FIT (20 pts) ───────────────

const SUN_BELT_TIER1 = ['TX', 'FL', 'GA', 'AZ', 'NC', 'TN', 'SC', 'NV'];
const SUN_BELT_TIER2 = ['CO', 'VA', 'UT', 'AL', 'LA', 'OK', 'AR', 'KY'];
const MAJOR_METRO    = ['CA', 'NY', 'IL', 'WA', 'MA', 'NJ', 'MD', 'MN'];

function deriveGeoTier(state: string, provided: ContractorScoringInput['geographic_tier']): ContractorScoringInput['geographic_tier'] {
  if (provided !== 'unknown') return provided;
  const s = state.toUpperCase();
  if (SUN_BELT_TIER1.includes(s)) return 'sun_belt_tier1';
  if (SUN_BELT_TIER2.includes(s)) return 'sun_belt_tier2';
  if (MAJOR_METRO.includes(s)) return 'major_metro_other';
  return 'secondary_market';
}

function scoreContractorGeo(tier: ContractorScoringInput['geographic_tier']): number {
  const map: Record<ContractorScoringInput['geographic_tier'], number> = {
    sun_belt_tier1: 8,
    sun_belt_tier2: 6,
    major_metro_other: 5,
    secondary_market: 3,
    rural_small: 1,
    unknown: 2,
  };
  return map[tier];
}

function scoreContractorSegment(segment: ContractorSegment): number {
  // Smart Home Champions need very little selling — just enrollment logistics
  // Customer Experience Innovators actively differentiate and want tech edge
  // Premium Service Specialists have the customer base that buys Nest
  // High-Volume Installers: scale makes up for lower per-unit engagement
  // Specialty HVAC: technically capable, trust-earned over time
  // Regional Growth: open to new things, building their brand
  // Service-First Traditionalists: needs education, trust-building phase first
  // Emergency Repair: lowest fit — reactive model doesn't match enrollment
  const map: Record<ContractorSegment, number> = {
    smart_home_champion:           12,
    customer_experience_innovator: 11,
    premium_service_specialist:    10,
    high_volume_installer:          8,
    specialty_hvac_integrator:      8,
    regional_growth_contractor:     6,
    service_first_traditionalist:   3,
    emergency_repair_focused:       1,
    unknown:                        2,
  };
  return map[segment];
}

export function getContractorSegmentLabel(segment: ContractorSegment): string {
  const labels: Record<ContractorSegment, string> = {
    smart_home_champion:           'Smart Home Champion',
    customer_experience_innovator: 'Customer Experience Innovator',
    premium_service_specialist:    'Premium Service Specialist',
    high_volume_installer:         'High-Volume Installer',
    specialty_hvac_integrator:     'Specialty HVAC Integrator',
    regional_growth_contractor:    'Regional Growth Contractor',
    service_first_traditionalist:  'Service-First Traditionalist',
    emergency_repair_focused:      'Emergency / Repair Focused',
    unknown:                       'Unclassified',
  };
  return labels[segment];
}

// ── CATEGORY 3: PROGRAM FIT (30 pts — highest weight) ───────

function scoreWorkType(focus: WorkTypeFocus): number {
  // New construction = highest Nest install opportunity
  // Replacement/retrofit = still good, more consultative sell
  // Service only = the hardest model to add smart home
  const map: Record<WorkTypeFocus, number> = {
    new_construction_dominant: 10,
    mixed_new_and_service:      8,
    replacement_retrofit_focus: 6,
    service_maintenance_only:   3,
    unknown:                    3,
  };
  return map[focus];
}

function scoreCompetitorStatus(status: CompetitorStatus): number {
  // THIS IS A CRITICAL SIGNAL.
  // Resideo/Honeywell is our primary competitive threat.
  // A contractor already enrolled as a Resideo dealer is MUCH harder
  // to convert. This penalty is significant and intentional.
  const map: Record<CompetitorStatus, number> = {
    no_smart_home_competitor:  10,
    evaluating_competitors:     7,
    ecobee_or_other_dealer:     5,
    unknown:                    4,
    resideo_honeywell_dealer:   2,
    committed_competitor:       0,
  };
  return map[status];
}

function scoreContractorSmartHomeReadiness(readiness: ContractorScoringInput['smart_home_readiness']): number {
  const map: Record<ContractorScoringInput['smart_home_readiness'], number> = {
    active_program:   6,
    considering:      5,
    open_no_program:  3,
    not_interested:   0,
  };
  return map[readiness];
}

function scoreContractorNestPro(status: ContractorScoringInput['nest_pro_status']): number {
  const map: Record<ContractorScoringInput['nest_pro_status'], number> = {
    enrolled_elite:          4,
    enrolled_standard:       3,
    purchased_not_enrolled:  2,
    no_history:              0,
  };
  return map[status];
}

// ── CATEGORY 4: CONTACT QUALITY & TRUST (15 pts) ────────────

function scoreContractorContactAuthority(authority: ContractorScoringInput['contact_authority']): number {
  const map: Record<ContractorScoringInput['contact_authority'], number> = {
    owner_csuite:     8,
    vp_director:      6,
    manager:          4,
    gatekeeper_only:  1,
    no_contact:       0,
  };
  return map[authority];
}

function scoreContactTrust(trust: ContactTrustLevel): number {
  // Trust is especially important with contractors.
  // Product discontinuations have left real scars.
  // A contractor with previous friction needs a
  // trust-rebuilding approach before program conversation.
  const map: Record<ContactTrustLevel, number> = {
    established_relationship: 7,
    neutral_prior_contact:    4,
    cold_no_prior_contact:    2,
    previous_friction:        0,
    unknown:                  2,
  };
  return map[trust];
}

// ── CATEGORY 5: TRAINING & TECH READINESS (10 pts) ──────────

function scoreTrainingReadiness(readiness: TrainingReadiness): number {
  // Formal training program = Nest Pro certification integrates naturally
  // This is the Wrench University angle — programs that exist get extended
  const map: Record<TrainingReadiness, number> = {
    formal_training_program:      6,
    informal_occasional:          4,
    no_training_infrastructure:   1,
    unknown:                      2,
  };
  return map[readiness];
}

function scoreTechAdoption(signal: TechAdoptionSignal): number {
  // ServiceTitan users are already operating at a tech-forward level
  // and their customers skew toward smart home buyers
  const map: Record<TechAdoptionSignal, number> = {
    servicetitan_or_equivalent: 4,
    basic_crm_or_software:      2,
    paper_based:                0,
    unknown:                    1,
  };
  return map[signal];
}

// ── PROGRAM READINESS STAGE ──────────────────────────────────

function determineProgramReadiness(score: number, input: ContractorScoringInput): ContractorScoreBreakdown['program_readiness_stage'] {
  if (
    input.smart_home_readiness === 'active_program' ||
    input.smart_home_readiness === 'considering'
  ) {
    if (score >= 60) return 'Ready to Enroll';
    return 'Needs Education';
  }
  if (input.competitor_status === 'committed_competitor') return 'Not a Fit';
  if (input.contact_trust_level === 'previous_friction') return 'Long-Term Nurture';
  if (score >= 45) return 'Needs Education';
  return 'Long-Term Nurture';
}

// ── CONFIDENCE ───────────────────────────────────────────────

function calculateContractorConfidence(input: ContractorScoringInput): 'High 90%+' | 'Medium 70-89%' | 'Low <70%' {
  let pts = 0;
  if (input.annual_install_units > 0) pts++;
  if (input.estimated_annual_revenue > 0) pts++;
  if (input.segment !== 'unknown') pts++;
  if (input.work_type_focus !== 'unknown') pts++;
  if (input.competitor_status !== 'unknown') pts++;
  if (input.contact_authority !== 'no_contact') pts++;
  if (input.contact_trust_level !== 'unknown') pts++;
  if (input.training_readiness !== 'unknown') pts++;
  if (input.tech_adoption_signal !== 'unknown') pts++;

  if (pts >= 8) return 'High 90%+';
  if (pts >= 5) return 'Medium 70-89%';
  return 'Low <70%';
}

// ── NARRATIVE ────────────────────────────────────────────────

function buildContractorNarrative(input: ContractorScoringInput, total: number): { strengths: string[]; gaps: string[] } {
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (input.segment === 'smart_home_champion') strengths.push('Smart Home Champion — advocacy conversation, not a sales conversation');
  if (input.segment === 'customer_experience_innovator') strengths.push('Already differentiates on customer experience — Nest Pro is a natural fit');
  if (input.segment === 'premium_service_specialist') strengths.push('Premium customer base aligns with Google Nest buyer profile');
  if (input.annual_install_units >= 500) strengths.push(`High-volume installer — ${input.annual_install_units} units/year`);
  if (input.service_agreement_count >= 250) strengths.push(`${input.service_agreement_count} service agreements — captive audience for Nest consultation`);
  if (input.work_type_focus === 'new_construction_dominant') strengths.push('New construction dominant — highest Nest install opportunity');
  if (input.competitor_status === 'no_smart_home_competitor') strengths.push('No competing smart home relationship — open field');
  if (input.training_readiness === 'formal_training_program') strengths.push('Formal training program in place — Nest Pro certification integrates naturally');
  if (input.tech_adoption_signal === 'servicetitan_or_equivalent') strengths.push('ServiceTitan user — tech-forward operation, smart home savvy customer base');
  if (input.contact_trust_level === 'established_relationship') strengths.push('Established relationship — trust is present');
  if (input.smart_home_readiness === 'considering') strengths.push('Already evaluating smart home options — timing is ideal');

  if (input.competitor_status === 'resideo_honeywell_dealer') gaps.push('Resideo/Honeywell dealer relationship — competitive threat, needs differentiation approach');
  if (input.competitor_status === 'committed_competitor') gaps.push('Committed competitor relationship — not a near-term conversion target');
  if (input.contact_trust_level === 'previous_friction') gaps.push('Previous friction noted — trust-building phase required before program conversation');
  if (input.segment === 'service_first_traditionalist') gaps.push('Service-First Traditionalist — education and trust phase before program ask');
  if (input.work_type_focus === 'service_maintenance_only') gaps.push('Service/maintenance focus — Nest install opportunity is lower');
  if (input.training_readiness === 'no_training_infrastructure') gaps.push('No training infrastructure — three-touch education process will take longer');
  if (input.service_agreement_count < 50) gaps.push('Small service agreement base — limited captive audience for smart home upsell');
  if (input.smart_home_readiness === 'not_interested') gaps.push('Not currently open to smart home program — business benefits presentation needed first');

  return { strengths, gaps };
}

// ── PRIORITY TIER ────────────────────────────────────────────

function assignContractorTier(score: number): 'P1' | 'P2' | 'P3' | 'Unscored' {
  if (score >= 72) return 'P1';
  if (score >= 52) return 'P2';
  if (score >= 32) return 'P3';
  return 'Unscored';
}

// ── MAIN EXPORT ──────────────────────────────────────────────

export function calculateContractorScore(input: ContractorScoringInput): ContractorScoreBreakdown {
  const effectiveTier = deriveGeoTier(input.state, input.geographic_tier);

  const install_volume_score          = scoreInstallVolume(input.annual_install_units);
  const revenue_score                 = scoreContractorRevenue(input.estimated_annual_revenue);
  const service_agreement_score       = scoreServiceAgreements(input.service_agreement_count);
  const segment_score                 = scoreContractorSegment(input.segment);
  const geographic_score              = scoreContractorGeo(effectiveTier);
  const work_type_score               = scoreWorkType(input.work_type_focus);
  const competitor_score              = scoreCompetitorStatus(input.competitor_status);
  const smart_home_readiness_score    = scoreContractorSmartHomeReadiness(input.smart_home_readiness);
  const nest_pro_score                = scoreContractorNestPro(input.nest_pro_status);
  const contact_authority_score       = scoreContractorContactAuthority(input.contact_authority);
  const contact_trust_score_sub       = scoreContactTrust(input.contact_trust_level);
  const training_score                = scoreTrainingReadiness(input.training_readiness);
  const tech_adoption_score           = scoreTechAdoption(input.tech_adoption_signal);

  const volume_scale_score    = install_volume_score + revenue_score + service_agreement_score;
  const market_segment_score  = segment_score + geographic_score;
  const program_fit_score     = work_type_score + competitor_score + smart_home_readiness_score + nest_pro_score;
  const contact_trust_score   = contact_authority_score + contact_trust_score_sub;
  const training_tech_score   = training_score + tech_adoption_score;

  const total_score = Math.min(100,
    volume_scale_score +
    market_segment_score +
    program_fit_score +
    contact_trust_score +
    training_tech_score
  );

  const { strengths, gaps } = buildContractorNarrative(input, total_score);

  return {
    volume_scale_score,
    market_segment_score,
    program_fit_score,
    contact_trust_score,
    training_tech_score,
    install_volume_score,
    revenue_score,
    service_agreement_score,
    segment_score,
    geographic_score,
    work_type_score,
    competitor_score,
    smart_home_readiness_score,
    nest_pro_score,
    contact_authority_score,
    contact_trust_score_sub,
    training_score,
    tech_adoption_score,
    total_score,
    priority_tier: assignContractorTier(total_score),
    confidence: calculateContractorConfidence(input),
    segment_label: getContractorSegmentLabel(input.segment),
    program_readiness_stage: determineProgramReadiness(total_score, input),
    key_strengths: strengths,
    key_gaps: gaps,
  };
}
