// ============================================================
// LEAD SCORING ROUTER + DB ADAPTER - Google Nest Pro Channel CRM v2.0
// ============================================================
// The pure scoring functions (calculateBuilderScore / calculateContractorScore)
// live in ./builderScoring and ./contractorScoring. This file:
//   1. Re-exports the pure router (routeAndScore) + thresholds + outreach helper
//   2. Provides calculateLeadScore(companyId) — the DB adapter that loads a
//      company, maps DB columns to scoring inputs, runs the v2 algorithm, and
//      writes the result back to the companies table.
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import {
  calculateBuilderScore,
  type BuilderScoringInput,
  type BuilderScoreBreakdown,
  type BuilderSegment,
  type GeographicTier,
  type NestProStatus,
  type SmartHomeReadiness,
  type WholesalePartnerMatch,
  type ContactAuthority,
} from './builderScoring';
import {
  calculateContractorScore,
  type ContractorScoringInput,
  type ContractorScoreBreakdown,
  type ContractorSegment,
  type WorkTypeFocus,
  type CompetitorStatus,
  type TrainingReadiness,
  type TechAdoptionSignal,
  type ContactTrustLevel,
} from './contractorScoring';

export type IndustryType = 'Builder' | 'Contractor' | 'Energy Implementer' | 'Engineer/Architect' | 'Partner/Other';

export interface UnifiedScoringResult {
  total_score: number;
  priority_tier: 'P1' | 'P2' | 'P3' | 'Unscored';
  confidence: 'High 90%+' | 'Medium 70-89%' | 'Low <70%';
  industry_type: IndustryType;
  segment_label: string;
  key_strengths: string[];
  key_gaps: string[];
  builder_breakdown?: BuilderScoreBreakdown;
  contractor_breakdown?: ContractorScoreBreakdown;
  program_readiness_stage?: ContractorScoreBreakdown['program_readiness_stage'];
  calculated_at: string;
  // Aliases for legacy callers
  totalScore: number;
  priorityTier: 'P1' | 'P2' | 'P3' | 'Unscored';
}

// ── Pure router (no DB) ──────────────────────────────────────
export function routeAndScore(
  industry_type: IndustryType,
  builderInput?: BuilderScoringInput,
  contractorInput?: ContractorScoringInput
): UnifiedScoringResult {
  const now = new Date().toISOString();

  if (industry_type === 'Builder' && builderInput) {
    const r = calculateBuilderScore(builderInput);
    return {
      total_score: r.total_score,
      priority_tier: r.priority_tier,
      confidence: r.confidence,
      industry_type,
      segment_label: r.segment_label,
      key_strengths: r.key_strengths,
      key_gaps: r.key_gaps,
      builder_breakdown: r,
      calculated_at: now,
      totalScore: r.total_score,
      priorityTier: r.priority_tier,
    };
  }

  if (contractorInput) {
    const r = calculateContractorScore(contractorInput);
    return {
      total_score: r.total_score,
      priority_tier: r.priority_tier,
      confidence: r.confidence,
      industry_type,
      segment_label: r.segment_label,
      key_strengths: r.key_strengths,
      key_gaps: r.key_gaps,
      contractor_breakdown: r,
      program_readiness_stage: r.program_readiness_stage,
      calculated_at: now,
      totalScore: r.total_score,
      priorityTier: r.priority_tier,
    };
  }

  return {
    total_score: 0,
    priority_tier: 'Unscored',
    confidence: 'Low <70%',
    industry_type,
    segment_label: 'Unclassified',
    key_strengths: [],
    key_gaps: ['Insufficient data to score — add firmographic and contact information'],
    calculated_at: now,
    totalScore: 0,
    priorityTier: 'Unscored',
  };
}

export const PRIORITY_THRESHOLDS = {
  builder: { P1: 75, P2: 55, P3: 35 },
  contractor: { P1: 72, P2: 52, P3: 32 },
};

// ── Outreach cadence recommendation ──────────────────────────
export function getOutreachRecommendation(result: UnifiedScoringResult): {
  approach: string;
  cadence: string;
  first_touch: string;
} {
  const stage = result.contractor_breakdown?.program_readiness_stage;

  if (stage === 'Ready to Enroll') {
    return {
      approach: 'Enrollment conversation — skip education phase',
      cadence: '5-touch sequence over 21 days',
      first_touch: 'Direct phone call or LinkedIn to decision maker',
    };
  }
  if (stage === 'Needs Education') {
    return {
      approach: 'Three-touch education process: business benefits → product training → sales training',
      cadence: '8-touch sequence over 45 days',
      first_touch: 'Business benefits email — lead with ARS proof point',
    };
  }
  if (stage === 'Long-Term Nurture') {
    return {
      approach: 'Relationship and trust building — no program ask yet',
      cadence: 'Monthly value-add touches (market data, tips, no ask)',
      first_touch: 'LinkedIn connection, no sales intent',
    };
  }
  if (result.priority_tier === 'P1') {
    return {
      approach: 'High-priority — direct decision maker outreach with ARS social proof',
      cadence: '5-touch sequence over 21 days',
      first_touch: 'Personalized email to owner or VP referencing their specific segment',
    };
  }
  if (result.priority_tier === 'P2') {
    return {
      approach: 'Standard outreach — enrollment conversation with market context',
      cadence: '5-touch sequence over 30 days',
      first_touch: 'Email with segment-relevant case study',
    };
  }
  return {
    approach: 'Nurture track — build awareness before program conversation',
    cadence: 'Quarterly check-in, no direct ask',
    first_touch: 'Add to Apollo nurture sequence',
  };
}

// ============================================================
// DB ADAPTER — maps companies row → scoring input → DB writeback
// ============================================================

// Title → ContactAuthority mapping
function mapContactAuthority(title?: string | null): ContactAuthority {
  if (!title) return 'no_contact';
  const t = title.toLowerCase();
  if (/owner|ceo|president|founder|co-founder|chief\s/.test(t)) return 'owner_csuite';
  if (/\bvp\b|vice president|director/.test(t)) return 'vp_director';
  if (/manager/.test(t)) return 'manager';
  if (/admin|assistant|coordinator|receptionist|front desk/.test(t)) return 'gatekeeper_only';
  return 'manager'; // default to manager-level for unclassified titles
}

function parseNumberLike(v: any, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : fallback;
}

// Best-effort: derive a numeric annual unit volume from either a numeric
// column or a range string like "100-199 units"
function deriveAnnualVolume(c: any): number {
  if (c.annual_volume != null) return parseNumberLike(c.annual_volume);
  const r = c.annual_volume_range as string | undefined;
  if (!r) return 0;
  const m = r.match(/(\d[\d,]*)/g);
  if (!m) return 0;
  const nums = m.map((s) => parseInt(s.replace(/,/g, ''), 10));
  return nums.length === 1 ? nums[0] : Math.round((nums[0] + nums[1]) / 2);
}

function deriveAverageHomePrice(c: any): number {
  if (c.average_home_price != null) return parseNumberLike(c.average_home_price);
  const r = c.average_home_price_range as string | undefined;
  if (!r) return 0;
  // Strings like "$300K-$399K" or "$750K+"
  const m = r.match(/(\d+)/g);
  if (!m) return 0;
  const nums = m.map(Number).map((n) => (n < 1000 ? n * 1000 : n));
  return nums.length === 1 ? nums[0] : Math.round((nums[0] + nums[1]) / 2);
}

function deriveAnnualRevenue(c: any): number {
  if (c.estimated_annual_revenue != null) return parseNumberLike(c.estimated_annual_revenue);
  if (c.annual_revenue != null) return parseNumberLike(c.annual_revenue);
  const r = c.annual_revenue_range as string | undefined;
  if (!r) return 0;
  // Strings like "$1M-$5M", "$10M+", "$500K-$1M"
  const tokens = r.toUpperCase().match(/(\d+(?:\.\d+)?)([KM])?/g);
  if (!tokens) return 0;
  const nums = tokens.map((t) => {
    const m = t.match(/(\d+(?:\.\d+)?)([KM])?/);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const unit = m[2];
    return unit === 'M' ? n * 1_000_000 : unit === 'K' ? n * 1_000 : n;
  });
  return nums.length === 1 ? nums[0] : Math.round((nums[0] + nums[1]) / 2);
}

function deriveInstallVolume(c: any): number {
  if (c.annual_install_units != null) return parseNumberLike(c.annual_install_units);
  if (c.annual_install_volume != null) return parseNumberLike(c.annual_install_volume);
  if (c.nest_installation_volume_range) {
    const m = String(c.nest_installation_volume_range).match(/(\d+)/g);
    if (m) {
      const nums = m.map(Number);
      return nums.length === 1 ? nums[0] : Math.round((nums[0] + nums[1]) / 2);
    }
  }
  return 0;
}

function buildBuilderInput(c: any): BuilderScoringInput {
  const bestContact = ((c.contacts ?? []) as any[]).reduce(
    (best: { authority: ContactAuthority; score: number }, contact: any) => {
      const a = mapContactAuthority(contact.title);
      const rank = { owner_csuite: 4, vp_director: 3, manager: 2, gatekeeper_only: 1, no_contact: 0 }[a];
      return rank > best.score ? { authority: a, score: rank } : best;
    },
    { authority: 'no_contact' as ContactAuthority, score: 0 }
  );



  return {
    annual_volume: deriveAnnualVolume(c),
    average_home_price: deriveAverageHomePrice(c),
    segment: (c.builder_segment as BuilderSegment) ?? 'unknown',
    geographic_tier: (c.geographic_tier as GeographicTier) ?? 'unknown',
    state: c.state ?? '',
    smart_home_readiness: (c.smart_home_readiness as SmartHomeReadiness) ?? 'open_no_program',
    wholesale_partner_match: (c.wholesale_partner_match as WholesalePartnerMatch) ?? 'unknown',
    nest_pro_status: (c.nest_pro_status as NestProStatus) ?? 'no_history',
    permits_in_pipeline: parseNumberLike(c.permits_in_pipeline, 0),
    contact_authority: bestContact.authority,
    contact_count_verified: (c.contacts ?? []).length,
    has_website: Boolean(c.website_url),
    website_has_smart_home_content: Boolean(c.website_has_smart_home_content),
    linkedin_company_active: Boolean(c.linkedin_company_url),
  };
}

function buildContractorInput(c: any): ContractorScoringInput {
  const bestContact = ((c.contacts ?? []) as any[]).reduce(
    (best: { authority: ContactAuthority; score: number }, contact: any) => {
      const a = mapContactAuthority(contact.title);
      const rank = { owner_csuite: 4, vp_director: 3, manager: 2, gatekeeper_only: 1, no_contact: 0 }[a];
      return rank > best.score ? { authority: a, score: rank } : best;
    },
    { authority: 'no_contact' as ContactAuthority, score: 0 }
  );

  // ContractorScoringInput restricts smart_home_readiness to specific values;
  // the DB field uses the Builder enum ("evaluating") which we normalize to
  // the contractor equivalent ("considering").
  const rawReadiness = (c.smart_home_readiness as string | null) ?? 'open_no_program';
  const normalizedReadiness: ContractorScoringInput['smart_home_readiness'] =
    rawReadiness === 'evaluating'
      ? 'considering'
      : (rawReadiness as ContractorScoringInput['smart_home_readiness']);


  return {
    annual_install_units: deriveInstallVolume(c),
    estimated_annual_revenue: deriveAnnualRevenue(c),
    service_agreement_count: parseNumberLike(c.service_agreement_count, 0),
    segment: (c.contractor_segment as ContractorSegment) ?? 'unknown',
    geographic_tier: (c.geographic_tier as ContractorScoringInput['geographic_tier']) ?? 'unknown',
    state: c.state ?? '',
    work_type_focus: (c.work_type_focus as WorkTypeFocus) ?? 'unknown',
    competitor_status: (c.competitor_status as CompetitorStatus) ?? 'unknown',
    smart_home_readiness: normalizedReadiness,
    nest_pro_status: (c.nest_pro_status as ContractorScoringInput['nest_pro_status']) ?? 'no_history',
    wholesale_partner_match: (c.wholesale_partner_match as ContractorScoringInput['wholesale_partner_match']) ?? 'unknown',
    contact_authority: bestContact.authority,
    contact_trust_level: (c.contact_trust_level as ContactTrustLevel) ?? 'unknown',
    training_readiness: (c.training_readiness as TrainingReadiness) ?? 'unknown',
    tech_adoption_signal: (c.tech_adoption_signal as TechAdoptionSignal) ?? 'unknown',
    has_website: Boolean(c.website_url),
    website_has_smart_home_content: Boolean(c.website_has_smart_home_content),
    linkedin_active: Boolean(c.linkedin_company_url),
  };
}

/**
 * Calculate v2.0 lead score for a company. Loads from DB, runs the
 * segment-aware algorithm, persists the result, and returns a unified
 * result with `totalScore` / `priorityTier` aliases for legacy callers.
 */
export async function calculateLeadScore(companyId: string): Promise<UnifiedScoringResult> {
  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      *,
      contacts:contacts(id, title, linkedin_url, linkedin_connections, linkedin_activity_score)
    `)
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const industry = (company.industry_type as IndustryType) ?? 'Contractor';
  const result =
    industry === 'Builder'
      ? routeAndScore('Builder', buildBuilderInput(company))
      : routeAndScore(industry, undefined, buildContractorInput(company));

  // Persist
  await supabase
    .from('companies')
    .update({
      lead_score: Math.round(result.total_score),
      // priority_tier is auto-set by the auto_assign_priority_tier trigger
      segment_confidence: result.confidence,
      score_breakdown_v2: result as any,
      program_readiness_stage: result.program_readiness_stage ?? null,
      score_calculated_at: result.calculated_at,
    } as any)
    .eq('id', companyId);

  return result;
}

// Legacy exports kept for backward compatibility with any imports.
// (Internal codebase only imports calculateLeadScore.)
export type ScoringBreakdown = UnifiedScoringResult;
