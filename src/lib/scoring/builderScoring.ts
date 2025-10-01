import { supabase } from '@/integrations/supabase/client';
import {
  calculateWebsiteScore,
  calculateSocialMediaScore,
  calculateTechnologyScore,
  calculateDecisionAuthorityScore,
  calculateLinkedInScore,
  calculateConfidence,
  calculateGeographicScore
} from './sharedScoring';

export interface BuilderScoringBreakdown {
  // Firmographic (50 points)
  volumeScore: number; // 0-15
  pricePointScore: number; // 0-10
  geographicScore: number; // 0-10
  stabilityScore: number; // 0-15
  firmographicTotal: number; // 0-50
  
  // Digital (30 points)
  websiteQualityScore: number; // 0-10
  socialMediaScore: number; // 0-10
  technologyAdoptionScore: number; // 0-10
  digitalTotal: number; // 0-30
  
  // Contact (20 points)
  decisionAuthorityScore: number; // 0-10
  linkedinProfessionalScore: number; // 0-10
  contactTotal: number; // 0-20
  
  // Total
  totalScore: number; // 0-100
  priorityTier: 'P1' | 'P2' | 'P3' | 'Unscored';
  confidence: 'High' | 'Medium' | 'Low';
}

/**
 * Calculate lead score for BUILDERS
 */
export async function calculateBuilderScore(companyId: string): Promise<BuilderScoringBreakdown> {
  // Fetch company with related data
  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      *,
      contacts:contacts(id, title, linkedin_url, linkedin_connections),
      installations:installation_history(product_type, installation_date)
    `)
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const scoring: BuilderScoringBreakdown = {
    volumeScore: 0,
    pricePointScore: 0,
    geographicScore: 0,
    stabilityScore: 0,
    firmographicTotal: 0,
    websiteQualityScore: 0,
    socialMediaScore: 0,
    technologyAdoptionScore: 0,
    digitalTotal: 0,
    decisionAuthorityScore: 0,
    linkedinProfessionalScore: 0,
    contactTotal: 0,
    totalScore: 0,
    priorityTier: 'Unscored',
    confidence: 'Low'
  };

  // ============================================
  // FIRMOGRAPHIC (50 points)
  // ============================================

  // 1. Volume Score (0-15 points) - HOMES PER YEAR
  scoring.volumeScore = calculateBuilderVolumeScore(company.annual_volume);

  // 2. Price Point Score (0-10 points) - AVERAGE HOME PRICE
  scoring.pricePointScore = calculateBuilderPriceScore(company.average_home_price);

  // 3. Geographic Score (0-10 points)
  scoring.geographicScore = calculateGeographicScore(company.state);

  // 4. Stability Score (0-15 points)
  scoring.stabilityScore = calculateBuilderStabilityScore({
    yearsInBusiness: company.years_in_business,
    employees: company.total_employees
  });

  scoring.firmographicTotal = 
    scoring.volumeScore +
    scoring.pricePointScore +
    scoring.geographicScore +
    scoring.stabilityScore;

  // ============================================
  // DIGITAL ENGAGEMENT (30 points)
  // ============================================

  scoring.websiteQualityScore = calculateWebsiteScore(company.website_url);
  scoring.socialMediaScore = calculateSocialMediaScore(company.linkedin_company_url);
  scoring.technologyAdoptionScore = calculateTechnologyScore(company.installations || []);

  scoring.digitalTotal = 
    scoring.websiteQualityScore +
    scoring.socialMediaScore +
    scoring.technologyAdoptionScore;

  // ============================================
  // CONTACT (20 points)
  // ============================================

  scoring.decisionAuthorityScore = calculateDecisionAuthorityScore(company.contacts || []);
  scoring.linkedinProfessionalScore = calculateLinkedInScore(company.contacts || []);

  scoring.contactTotal = 
    scoring.decisionAuthorityScore +
    scoring.linkedinProfessionalScore;

  // ============================================
  // TOTAL SCORE & PRIORITY TIER
  // ============================================

  scoring.totalScore = 
    scoring.firmographicTotal +
    scoring.digitalTotal +
    scoring.contactTotal;

  if (scoring.totalScore >= 80) {
    scoring.priorityTier = 'P1';
  } else if (scoring.totalScore >= 60) {
    scoring.priorityTier = 'P2';
  } else if (scoring.totalScore >= 40) {
    scoring.priorityTier = 'P3';
  } else {
    scoring.priorityTier = 'Unscored';
  }

  scoring.confidence = calculateConfidence(company);

  // Save to database
  await saveBuilderScoreToDatabase(companyId, scoring);

  return scoring;
}

// ============================================
// BUILDER-SPECIFIC HELPER FUNCTIONS
// ============================================

function calculateBuilderVolumeScore(volume?: number): number {
  if (!volume) return 0;

  // Builders scored on HOMES per year
  if (volume >= 100) return 15;
  if (volume >= 50) return 12;
  if (volume >= 25) return 10;
  if (volume >= 10) return 8;
  return 5;
}

function calculateBuilderPriceScore(averageHomePrice?: number): number {
  if (!averageHomePrice) return 0;

  // Score based on average home price - matching rubric
  if (averageHomePrice >= 800000) return 10; // $800K+ (luxury premium)
  if (averageHomePrice >= 400000) return 8;  // $400K-$799K (sweet spot)
  if (averageHomePrice >= 200000) return 6;  // $200K-$399K (volume opportunity)
  return 4; // <$200K (limited margin)
}

function calculateBuilderStabilityScore(data: {
  yearsInBusiness?: number;
  employees?: number;
}): number {
  let score = 0;

  // Revenue growth indicators (0-5 points)
  // Using years in business as proxy for stability/growth
  if (data.yearsInBusiness) {
    if (data.yearsInBusiness >= 10) score += 5; // Established with track record
    else if (data.yearsInBusiness >= 5) score += 3; // Growing/stable
    else if (data.yearsInBusiness >= 3) score += 2; // New but present
  }

  // Multiple active projects/communities (0-5 points)
  // Using employee count as proxy for project capacity
  if (data.employees) {
    if (data.employees >= 50) score += 5; // Large operation
    else if (data.employees >= 25) score += 4; // Mid-size with capacity
    else if (data.employees >= 10) score += 3; // Small but active
    else if (data.employees >= 5) score += 2; // Micro but viable
  }

  // Note: Awards/recognition (3pts) and reviews/reputation (2pts) 
  // would require additional data fields to score accurately

  return Math.min(score, 15);
}

async function saveBuilderScoreToDatabase(
  companyId: string,
  scoring: BuilderScoringBreakdown
): Promise<void> {
  // Save detailed breakdown to builder_scoring_details
  await supabase
    .from('builder_scoring_details')
    .upsert({
      company_id: companyId,
      volume_score: scoring.volumeScore,
      price_point_score: scoring.pricePointScore,
      geographic_score: scoring.geographicScore,
      stability_score: scoring.stabilityScore,
      firmographic_total: scoring.firmographicTotal,
      website_quality_score: scoring.websiteQualityScore,
      social_media_score: scoring.socialMediaScore,
      technology_adoption_score: scoring.technologyAdoptionScore,
      digital_total: scoring.digitalTotal,
      decision_authority_score: scoring.decisionAuthorityScore,
      linkedin_professional_score: scoring.linkedinProfessionalScore,
      contact_total: scoring.contactTotal,
      total_score: scoring.totalScore,
      priority_tier: scoring.priorityTier,
      confidence: scoring.confidence,
      calculated_at: new Date().toISOString()
    });

  // Update company with total score
  await supabase
    .from('companies')
    .update({
      lead_score: scoring.totalScore,
      segment_confidence: scoring.confidence,
      score_calculated_at: new Date().toISOString()
    } as any)
    .eq('id', companyId);
}
