import { supabase } from '@/integrations/supabase/client';

export interface ScoringBreakdown {
  // Company Firmographic (50 points)
  volumeScore: number; // 0-15
  pricePointScore: number; // 0-10
  geographicScore: number; // 0-10
  stabilityScore: number; // 0-15
  firmographicTotal: number; // 0-50
  
  // Digital Engagement (30 points)
  websiteQualityScore: number; // 0-10
  socialMediaScore: number; // 0-10
  technologyAdoptionScore: number; // 0-10
  digitalTotal: number; // 0-30
  
  // Individual Contact (20 points)
  decisionAuthorityScore: number; // 0-10
  linkedinProfessionalScore: number; // 0-10
  contactTotal: number; // 0-20
  
  // Total
  totalScore: number; // 0-100
  priorityTier: 'P1' | 'P2' | 'P3' | 'Unscored';
  confidence: 'High 90%+' | 'Medium 70-89%' | 'Low <70%';
}

/**
 * Calculate lead score for a company
 * This is called automatically when company data changes
 */
export async function calculateLeadScore(companyId: string): Promise<ScoringBreakdown> {
  // Fetch company with related data
  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      *,
      contacts:contacts(id, title, linkedin_url, linkedin_connections),
      installations:installation_history(product_type, installation_date),
      branches:company_branches(city, state)
    `)
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const scoring: ScoringBreakdown = {
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
    confidence: 'Low <70%'
  };

  // ============================================
  // CATEGORY 1: COMPANY FIRMOGRAPHIC (50 points)
  // ============================================

  // 1. Annual Volume Score (0-15 points)
  // Calculate total volume from all branches
  const totalVolume = (company.branches || []).reduce((sum: number, branch: any) => 
    sum + (branch.annual_volume || 0), 0
  );
  scoring.volumeScore = calculateVolumeScore(
    company.industry_type,
    totalVolume
  );

  // 2. Price Point / Revenue Score (0-10 points)
  scoring.pricePointScore = calculatePricePointScore(
    company.industry_type,
    company.annual_revenue_range
  );

  // 3. Geographic Market Score (0-10 points)
  scoring.geographicScore = calculateGeographicScore(company.city);

  // 4. Business Stability Score (0-15 points)
  scoring.stabilityScore = calculateStabilityScore({
    yearsInBusiness: company.years_in_business,
    employees: company.total_employees
  });

  scoring.firmographicTotal = 
    scoring.volumeScore +
    scoring.pricePointScore +
    scoring.geographicScore +
    scoring.stabilityScore;

  // ============================================
  // CATEGORY 2: DIGITAL ENGAGEMENT (30 points)
  // ============================================

  // 1. Website Quality (0-10 points)
  scoring.websiteQualityScore = calculateWebsiteScore(company.website_url);

  // 2. Social Media Presence (0-10 points)
  scoring.socialMediaScore = calculateSocialMediaScore(
    company.linkedin_company_url
  );

  // 3. Technology Adoption (0-10 points)
  scoring.technologyAdoptionScore = calculateTechnologyScore(
    company.installations || []
  );

  scoring.digitalTotal = 
    scoring.websiteQualityScore +
    scoring.socialMediaScore +
    scoring.technologyAdoptionScore;

  // ============================================
  // CATEGORY 3: INDIVIDUAL CONTACT (20 points)
  // ============================================

  // 1. Decision Authority (0-10 points)
  scoring.decisionAuthorityScore = calculateDecisionAuthorityScore(
    company.contacts || []
  );

  // 2. LinkedIn Professional Activity (0-10 points)
  scoring.linkedinProfessionalScore = calculateLinkedInScore(
    company.contacts || []
  );

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

  // Priority tier assigned automatically by database trigger
  if (scoring.totalScore >= 80) {
    scoring.priorityTier = 'P1';
  } else if (scoring.totalScore >= 60) {
    scoring.priorityTier = 'P2';
  } else if (scoring.totalScore >= 40) {
    scoring.priorityTier = 'P3';
  } else {
    scoring.priorityTier = 'Unscored';
  }

  // Calculate confidence
  scoring.confidence = calculateConfidence(company);

  // Save to database
  await saveScoreToDatabase(companyId, scoring);

  return scoring;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateVolumeScore(
  industryType: 'Builder' | 'Contractor',
  volume?: number
): number {
  if (!volume) return 0;

  if (industryType === 'Builder') {
    // Builders: homes per year
    if (volume >= 100) return 15;
    if (volume >= 50) return 12;
    if (volume >= 25) return 10;
    if (volume >= 10) return 8;
    return 5;
  } else {
    // Contractors: service calls per year
    if (volume >= 2500) return 15;
    if (volume >= 1000) return 12;
    if (volume >= 500) return 10;
    if (volume >= 250) return 8;
    return 5;
  }
}

function calculatePricePointScore(
  industryType: 'Builder' | 'Contractor',
  revenueRange?: string
): number {
  if (!revenueRange) return 0;

  const revenueMap: Record<string, number> = {
    '$10M+': 10,
    '$6M-$10M': 9,
    '$3M-$5.9M': 8,
    '$1M-$2.9M': 6,
    '$500K-$999K': 4,
    '<$500K': 2
  };

  return revenueMap[revenueRange] || 0;
}

function calculateGeographicScore(city?: string): number {
  if (!city) return 0;

  // Primary Sun Belt markets
  const primaryMarkets = ['TX', 'FL', 'NC', 'AZ', 'GA', 'TN'];
  if (primaryMarkets.includes(city.toUpperCase())) return 10;

  // Secondary growth markets
  const secondaryMarkets = ['CO', 'UT', 'VA', 'SC', 'NV', 'ID'];
  if (secondaryMarkets.includes(city.toUpperCase())) return 7;

  // All other locations
  return 4;
}

function calculateStabilityScore(data: {
  yearsInBusiness?: number;
  employees?: number;
}): number {
  let score = 0;

  // Years in business (0-8 points)
  if (data.yearsInBusiness) {
    if (data.yearsInBusiness >= 15) score += 8;
    else if (data.yearsInBusiness >= 10) score += 6;
    else if (data.yearsInBusiness >= 5) score += 4;
    else if (data.yearsInBusiness >= 3) score += 2;
  }

  // Employee count (0-7 points)
  if (data.employees) {
    if (data.employees >= 100) score += 7;
    else if (data.employees >= 50) score += 5;
    else if (data.employees >= 25) score += 4;
    else if (data.employees >= 10) score += 2;
  }

  return Math.min(score, 15);
}

function calculateWebsiteScore(websiteUrl?: string): number {
  if (!websiteUrl) return 0;
  
  // Has website = base 6 points
  // Additional points based on quality indicators would be added
  // For now, having a website = 6 points
  return 6;
}

function calculateSocialMediaScore(linkedinUrl?: string): number {
  if (!linkedinUrl) return 0;
  
  // Has LinkedIn = base 5 points
  // Additional points based on activity would be added
  return 5;
}

function calculateTechnologyScore(installations: any[]): number {
  if (!installations || installations.length === 0) return 0;

  // Score based on installation count and recency
  const recentInstalls = installations.filter(i => {
    const monthsSince = 
      (Date.now() - new Date(i.installation_date).getTime()) / 
      (1000 * 60 * 60 * 24 * 30);
    return monthsSince <= 12;
  });

  if (recentInstalls.length >= 20) return 10;
  if (recentInstalls.length >= 10) return 8;
  if (recentInstalls.length >= 5) return 6;
  if (recentInstalls.length >= 1) return 4;
  return 0;
}

function calculateDecisionAuthorityScore(contacts: any[]): number {
  if (!contacts || contacts.length === 0) return 0;

  let maxScore = 0;

  const titleScores: Record<string, number> = {
    'CEO': 10, 'President': 10, 'Owner': 10, 'Founder': 10,
    'COO': 10, 'CFO': 10, 'CMO': 10, 'CTO': 10,
    'VP': 8, 'Vice President': 8,
    'Director': 6,
    'Manager': 4
  };

  contacts.forEach(contact => {
    const title = (contact.title || '').toUpperCase();
    
    for (const [keyword, score] of Object.entries(titleScores)) {
      if (title.includes(keyword.toUpperCase())) {
        maxScore = Math.max(maxScore, score);
      }
    }
  });

  return maxScore;
}

function calculateLinkedInScore(contacts: any[]): number {
  if (!contacts || contacts.length === 0) return 0;

  let maxScore = 0;

  contacts.forEach(contact => {
    let contactScore = 0;

    // Has LinkedIn URL = 3 points
    if (contact.linkedin_url) contactScore += 3;

    // 1000+ connections = 4 points
    if (contact.linkedin_connections >= 1000) contactScore += 4;

    maxScore = Math.max(maxScore, contactScore);
  });

  return Math.min(maxScore, 10);
}

function calculateConfidence(company: any): 'High 90%+' | 'Medium 70-89%' | 'Low <70%' {
  let dataPoints = 0;

  // Count available data points
  const hasVolume = (company.branches || []).some((b: any) => b.annual_volume > 0);
  if (hasVolume) dataPoints++;
  if (company.annual_revenue_range) dataPoints++;
  if (company.website_url) dataPoints++;
  if (company.linkedin_company_url) dataPoints++;
  if (company.contacts?.length > 0) dataPoints++;
  if (company.installations?.length > 0) dataPoints++;
  if (company.city) dataPoints++;
  if (company.years_in_business) dataPoints++;

  const completeness = (dataPoints / 8) * 100;

  if (completeness >= 90) return 'High 90%+';
  if (completeness >= 70) return 'Medium 70-89%';
  return 'Low <70%';
}

async function saveScoreToDatabase(
  companyId: string,
  scoring: ScoringBreakdown
): Promise<void> {
  // Save detailed breakdown
  await supabase
    .from('segmentation_scores')
    .upsert({
      company_id: companyId,
      builder_volume_score: scoring.volumeScore,
      builder_price_point_score: scoring.pricePointScore,
      builder_geographic_score: scoring.geographicScore,
      builder_stability_score: scoring.stabilityScore,
      website_quality_score: scoring.websiteQualityScore,
      social_media_score: scoring.socialMediaScore,
      technology_adoption_score: scoring.technologyAdoptionScore,
      decision_authority_score: scoring.decisionAuthorityScore,
      linkedin_professional_score: scoring.linkedinProfessionalScore,
      total_score: scoring.totalScore,
      calculated_at: new Date().toISOString()
    });

  // Update company with total score
  // Priority tier is auto-assigned by database trigger
  await supabase
    .from('companies')
    .update({
      lead_score: scoring.totalScore,
      segment_confidence: scoring.confidence,
      score_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', companyId);
}
