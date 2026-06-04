// ============================================================
// BUILDER LEAD SCORING - Google Nest Pro Channel CRM
// Version 2.0 — Segment-Aware Algorithm
// ============================================================
// Reflects: 7 builder segments, Sun Belt geo weighting,
// wholesale partner match, permit pipeline signals,
// and Nest Pro program fit as first-class scoring category.
// ============================================================

export type BuilderSegment =
  | 'production_tract'
  | 'regional_mid_volume'
  | 'spec_home'
  | 'luxury_custom'
  | 'multi_family'
  | 'affordable_housing'
  | 'active_adult_55plus'
  | 'unknown';

export type GeographicTier =
  | 'sun_belt_tier1'   // Phoenix, Dallas, Houston, Austin, Atlanta, Charlotte, Tampa, Orlando
  | 'sun_belt_tier2'   // Denver, Las Vegas, Raleigh, Nashville, Jacksonville, San Antonio
  | 'major_metro_other' // Chicago, LA, Seattle, NYC, Boston
  | 'secondary_market'
  | 'rural_small'
  | 'unknown';

export type NestProStatus =
  | 'enrolled_elite'
  | 'enrolled_standard'
  | 'purchased_not_enrolled'
  | 'no_history';

export type SmartHomeReadiness =
  | 'active_program'
  | 'evaluating'
  | 'open_no_program'
  | 'not_interested';

export type WholesalePartnerMatch =
  | 'key_nest_pro_partner'     // Ferguson, Winsupply, Johnstone, etc.
  | 'distributor_with_relationship'
  | 'unknown'
  | 'non_partner_distributor';

export type ContactAuthority =
  | 'owner_csuite'       // Owner, CEO, President, Co-Founder
  | 'vp_director'        // VP Sales, Director of Purchasing, Director of Construction
  | 'manager'            // Purchasing Manager, Construction Manager
  | 'gatekeeper_only'
  | 'no_contact';

export interface BuilderScoringInput {
  // Volume & Scale (25 pts)
  annual_volume: number;                // homes per year
  average_home_price: number;           // USD

  // Market & Segment (25 pts)
  segment: BuilderSegment;
  geographic_tier: GeographicTier;
  state: string;                        // 2-letter state code

  // Nest Program Fit (25 pts)
  smart_home_readiness: SmartHomeReadiness;
  wholesale_partner_match: WholesalePartnerMatch;
  nest_pro_status: NestProStatus;
  permits_in_pipeline: number;          // active permits > 250 units from monitoring system

  // Contact Quality (20 pts)
  contact_authority: ContactAuthority;
  contact_count_verified: number;       // confirmed contacts in CRM

  // Digital & Engagement Signals (5 pts)
  has_website: boolean;
  website_has_smart_home_content: boolean;
  linkedin_company_active: boolean;
}

export interface BuilderScoreBreakdown {
  // Category scores
  volume_scale_score: number;           // 0-25
  market_segment_score: number;         // 0-25
  nest_program_fit_score: number;       // 0-25
  contact_quality_score: number;        // 0-20
  digital_engagement_score: number;     // 0-5

  // Sub-scores for UI display
  annual_volume_score: number;          // 0-12
  price_point_score: number;            // 0-13
  segment_score: number;                // 0-15
  geographic_score: number;             // 0-10
  smart_home_readiness_score: number;   // 0-10
  wholesale_partner_score: number;      // 0-8
  nest_pro_status_score: number;        // 0-7
  contact_authority_score: number;      // 0-12
  contact_depth_score: number;          // 0-8
  digital_score: number;                // 0-5

  // Totals
  total_score: number;                  // 0-100
  priority_tier: 'P1' | 'P2' | 'P3' | 'Unscored';
  confidence: 'High 90%+' | 'Medium 70-89%' | 'Low <70%';
  segment_label: string;
  key_strengths: string[];
  key_gaps: string[];
}

// ── CATEGORY 1: VOLUME & SCALE (25 pts) ─────────────────────

function scoreAnnualVolume(units: number): number {
  if (units >= 500) return 12;
  if (units >= 200) return 10;
  if (units >= 100) return 8;
  if (units >= 50)  return 6;
  if (units >= 25)  return 4;
  if (units >= 10)  return 2;
  return 1;
}

function scorePricePoint(price: number): number {
  // Higher price = higher likelihood of premium smart home spec
  if (price >= 750000) return 13;
  if (price >= 500000) return 11;
  if (price >= 400000) return 9;
  if (price >= 300000) return 7;
  if (price >= 200000) return 5;
  if (price >= 150000) return 3;
  return 1;
}

// ── CATEGORY 2: MARKET & SEGMENT FIT (25 pts) ───────────────

// Sun Belt Tier 1: Phoenix, Dallas, Houston, Austin, Atlanta,
//   Charlotte, Tampa, Orlando, Miami, Las Vegas (NV), Denver (CO),
//   Raleigh (NC), Nashville (TN)
const SUN_BELT_TIER1_STATES = ['TX', 'FL', 'GA', 'AZ', 'NC', 'TN', 'SC', 'NV'];
const SUN_BELT_TIER2_STATES = ['CO', 'VA', 'UT', 'AL', 'MS', 'LA', 'OK', 'AR', 'KY'];
const MAJOR_METRO_STATES    = ['CA', 'NY', 'IL', 'WA', 'MA', 'NJ', 'MD', 'MN', 'OR'];

function deriveGeographicTier(state: string, provided_tier: GeographicTier): GeographicTier {
  if (provided_tier !== 'unknown') return provided_tier;
  const s = state.toUpperCase();
  if (SUN_BELT_TIER1_STATES.includes(s)) return 'sun_belt_tier1';
  if (SUN_BELT_TIER2_STATES.includes(s)) return 'sun_belt_tier2';
  if (MAJOR_METRO_STATES.includes(s)) return 'major_metro_other';
  return 'secondary_market';
}

function scoreGeographic(tier: GeographicTier): number {
  const map: Record<GeographicTier, number> = {
    sun_belt_tier1: 10,
    sun_belt_tier2: 8,
    major_metro_other: 6,
    secondary_market: 4,
    rural_small: 2,
    unknown: 2,
  };
  return map[tier];
}

function scoreBuilderSegment(segment: BuilderSegment): number {
  // Reflects Nest Pro value delivery per segment
  // Luxury Custom: highest per-unit Nest basket, most likely to spec premium
  // Active Adult: aging-in-place tech is a genuine draw, high income buyers
  // Spec/Regional: good volume and price point mix
  // Production: volume wins even at lower per-unit
  // Multi-Family: different play, MDU products, lower individual unit score
  // Affordable Housing: genuine budget constraints, lowest priority
  const map: Record<BuilderSegment, number> = {
    luxury_custom:       15,
    active_adult_55plus: 13,
    spec_home:           12,
    regional_mid_volume: 10,
    production_tract:    8,
    multi_family:        5,
    affordable_housing:  2,
    unknown:             3,
  };
  return map[segment];
}

export function getBuilderSegmentLabel(segment: BuilderSegment): string {
  const labels: Record<BuilderSegment, string> = {
    luxury_custom:       'Luxury Custom',
    active_adult_55plus: 'Active Adult / 55+',
    spec_home:           'Spec Home',
    regional_mid_volume: 'Regional Mid-Volume',
    production_tract:    'Production / Tract',
    multi_family:        'Multi-Family',
    affordable_housing:  'Affordable Housing',
    unknown:             'Unclassified',
  };
  return labels[segment];
}

// ── CATEGORY 3: NEST PROGRAM FIT (25 pts) ───────────────────
// This is the most strategically important category.
// We are selling enrollment into a program, not a product.

function scoreSmartHomeReadiness(readiness: SmartHomeReadiness, permits: number): number {
  // Permit pipeline is a bonus modifier — active builder with large pipeline
  // gets a boost because timing for enrollment conversation is optimal
  const base: Record<SmartHomeReadiness, number> = {
    active_program:    10,
    evaluating:         8,
    open_no_program:    5,
    not_interested:     0,
  };
  const permitBonus = permits >= 250 ? 2 : permits >= 100 ? 1 : 0;
  return Math.min(10, base[readiness] + permitBonus);
}

function scoreWholesalePartnerMatch(match: WholesalePartnerMatch): number {
  // If they already buy through a Nest Pro wholesale partner,
  // the enrollment conversation is dramatically easier
  const map: Record<WholesalePartnerMatch, number> = {
    key_nest_pro_partner:           8,
    distributor_with_relationship:  5,
    unknown:                        2,
    non_partner_distributor:        0,
  };
  return map[match];
}

function scoreNestProStatus(status: NestProStatus): number {
  const map: Record<NestProStatus, number> = {
    enrolled_elite:          7,
    enrolled_standard:       5,
    purchased_not_enrolled:  3,
    no_history:              0,
  };
  return map[status];
}

// ── CATEGORY 4: CONTACT QUALITY (20 pts) ────────────────────

function scoreContactAuthority(authority: ContactAuthority): number {
  const map: Record<ContactAuthority, number> = {
    owner_csuite:     12,
    vp_director:       9,
    manager:           5,
    gatekeeper_only:   2,
    no_contact:        0,
  };
  return map[authority];
}

function scoreContactDepth(count: number): number {
  if (count >= 3) return 8;
  if (count === 2) return 6;
  if (count === 1) return 3;
  return 0;
}

// ── CATEGORY 5: DIGITAL & ENGAGEMENT (5 pts) ────────────────

function scoreDigital(input: BuilderScoringInput): number {
  let score = 0;
  if (input.has_website) score += 2;
  if (input.website_has_smart_home_content) score += 2;
  if (input.linkedin_company_active) score += 1;
  return score;
}

// ── CONFIDENCE CALCULATION ───────────────────────────────────

function calculateBuilderConfidence(input: BuilderScoringInput): 'High 90%+' | 'Medium 70-89%' | 'Low <70%' {
  let dataPoints = 0;
  if (input.annual_volume > 0) dataPoints++;
  if (input.average_home_price > 0) dataPoints++;
  if (input.segment !== 'unknown') dataPoints++;
  if (input.geographic_tier !== 'unknown' || input.state) dataPoints++;
  if (input.smart_home_readiness) dataPoints++;
  if (input.wholesale_partner_match !== 'unknown') dataPoints++;
  if (input.contact_authority !== 'no_contact') dataPoints++;
  if (input.contact_count_verified > 0) dataPoints++;
  if (input.nest_pro_status !== 'no_history') dataPoints++;

  if (dataPoints >= 8) return 'High 90%+';
  if (dataPoints >= 5) return 'Medium 70-89%';
  return 'Low <70%';
}

// ── STRENGTHS & GAPS NARRATIVE ───────────────────────────────

function buildBuilderNarrative(breakdown: Partial<BuilderScoreBreakdown>, input: BuilderScoringInput): { strengths: string[]; gaps: string[] } {
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (input.annual_volume >= 200) strengths.push(`High volume builder — ${input.annual_volume} units/year`);
  if (input.average_home_price >= 400000) strengths.push(`Premium price point ($${(input.average_home_price / 1000).toFixed(0)}K avg)`);
  if (breakdown.segment_score! >= 12) strengths.push(`${getBuilderSegmentLabel(input.segment)} segment — strong Nest fit`);
  if (breakdown.geographic_score! >= 8) strengths.push('High-priority Sun Belt market');
  if (input.smart_home_readiness === 'active_program') strengths.push('Active smart home program — enrollment conversation is natural');
  if (input.smart_home_readiness === 'evaluating') strengths.push('Evaluating smart home options — timing is ideal');
  if (input.wholesale_partner_match === 'key_nest_pro_partner') strengths.push('Already buys through key Nest Pro wholesale partner');
  if (input.nest_pro_status === 'enrolled_elite' || input.nest_pro_status === 'enrolled_standard') strengths.push('Existing Nest Pro relationship');
  if (input.contact_authority === 'owner_csuite') strengths.push('Direct access to owner/C-suite');
  if (input.permits_in_pipeline >= 250) strengths.push(`${input.permits_in_pipeline} units in active permit pipeline — enrollment timing is optimal`);

  if (input.annual_volume < 25) gaps.push('Low unit volume — prioritize after higher-volume builders');
  if (input.average_home_price < 200000) gaps.push('Price point may limit smart home add-on potential');
  if (input.smart_home_readiness === 'not_interested') gaps.push('Not currently open to smart home program — needs education phase first');
  if (input.wholesale_partner_match === 'non_partner_distributor') gaps.push('Buys through non-partner distributor — wholesale conversation needed first');
  if (input.contact_authority === 'no_contact' || input.contact_authority === 'gatekeeper_only') gaps.push('No confirmed decision-maker contact — outreach priority');
  if (input.segment === 'affordable_housing') gaps.push('Affordable housing segment — budget constraints limit program fit');
  if (input.segment === 'multi_family') gaps.push('Multi-family segment — standard program may need MDU adjustment');

  return { strengths, gaps };
}

// ── PRIORITY TIER ────────────────────────────────────────────

function assignPriorityTier(score: number): 'P1' | 'P2' | 'P3' | 'Unscored' {
  if (score >= 70) return 'P1';
  if (score >= 45) return 'P2';
  if (score >= 20) return 'P3';
  return 'Unscored';
}

// ── MAIN EXPORT ──────────────────────────────────────────────

export function calculateBuilderScore(input: BuilderScoringInput): BuilderScoreBreakdown {
  const effectiveTier = deriveGeographicTier(input.state, input.geographic_tier);

  const annual_volume_score         = scoreAnnualVolume(input.annual_volume);
  const price_point_score           = scorePricePoint(input.average_home_price);
  const segment_score               = scoreBuilderSegment(input.segment);
  const geographic_score            = scoreGeographic(effectiveTier);
  const smart_home_readiness_score  = scoreSmartHomeReadiness(input.smart_home_readiness, input.permits_in_pipeline);
  const wholesale_partner_score     = scoreWholesalePartnerMatch(input.wholesale_partner_match);
  const nest_pro_status_score       = scoreNestProStatus(input.nest_pro_status);
  const contact_authority_score     = scoreContactAuthority(input.contact_authority);
  const contact_depth_score         = scoreContactDepth(input.contact_count_verified);
  const digital_score               = scoreDigital(input);

  const volume_scale_score    = annual_volume_score + price_point_score;
  const market_segment_score  = segment_score + geographic_score;
  const nest_program_fit_score = smart_home_readiness_score + wholesale_partner_score + nest_pro_status_score;
  const contact_quality_score = contact_authority_score + contact_depth_score;
  const digital_engagement_score = digital_score;

  const total_score = Math.min(100,
    volume_scale_score +
    market_segment_score +
    nest_program_fit_score +
    contact_quality_score +
    digital_engagement_score
  );

  const partial: Partial<BuilderScoreBreakdown> = {
    segment_score, geographic_score, annual_volume_score, price_point_score
  };
  const { strengths, gaps } = buildBuilderNarrative(partial, input);

  return {
    volume_scale_score,
    market_segment_score,
    nest_program_fit_score,
    contact_quality_score,
    digital_engagement_score,
    annual_volume_score,
    price_point_score,
    segment_score,
    geographic_score,
    smart_home_readiness_score,
    wholesale_partner_score,
    nest_pro_status_score,
    contact_authority_score,
    contact_depth_score,
    digital_score,
    total_score,
    priority_tier: assignPriorityTier(total_score),
    confidence: calculateBuilderConfidence(input),
    segment_label: getBuilderSegmentLabel(input.segment),
    key_strengths: strengths,
    key_gaps: gaps,
  };
}
