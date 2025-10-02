import { supabase } from '@/integrations/supabase/client';
import { getScoreForRange } from './rangeScoringEngine';
import {
  calculateGeographicScore,
  assignPriorityTier,
  calculateConfidence
} from './sharedScoring';

export interface ContractorScoringBreakdown {
  // Firmographic (50 points)
  volumeScore: number; // 0-12 points
  revenueScore: number; // 0-12 points
  businessModelScore: number; // 0-8 points
  geographicScore: number; // 0-10 points
  stabilityScore: number; // 0-8 points (employees + years)
  firmographicTotal: number;
  
  // Digital Engagement (30 points)
  websiteQualityScore: number; // 0-10 points
  linkedinActivityScore: number; // 0-10 points
  technologyAdoptionScore: number; // 0-10 points
  digitalTotal: number;
  
  // Contact Quality (20 points)
  decisionAuthorityScore: number; // 0-10 points
  linkedinProfessionalScore: number; // 0-10 points
  contactTotal: number;
  
  totalScore: number;
  priorityTier: 'P1' | 'P2' | 'P3' | 'Unscored';
  confidence: 'High' | 'Medium' | 'Low';
}

/**
 * Calculate lead score for CONTRACTORS using range-based scoring
 */
export async function calculateContractorScore(companyId: string): Promise<ContractorScoringBreakdown> {
  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      *,
      contacts:contacts(id, title, linkedin_url, linkedin_connections, linkedin_activity_score)
    `)
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error('Company not found');
  }

  if (company.industry_type !== 'Contractor') {
    throw new Error('Company is not a Contractor');
  }

  const scoring: ContractorScoringBreakdown = {
    volumeScore: 0,
    revenueScore: 0,
    businessModelScore: 0,
    geographicScore: 0,
    stabilityScore: 0,
    firmographicTotal: 0,
    websiteQualityScore: 0,
    linkedinActivityScore: 0,
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
  // CONTRACTOR FIRMOGRAPHIC SCORING (50 points)
  // ============================================
  
  // 1. Volume Score (0-12 points) - FROM RANGE
  if (company.annual_volume_range) {
    scoring.volumeScore = await getScoreForRange(
      'annual_volume_range',
      company.annual_volume_range,
      'Contractor'
    );
  }
  
  // 2. Revenue Score (0-12 points) - FROM DATABASE
  if (company.annual_revenue_range) {
    scoring.revenueScore = await getScoreForRange(
      'annual_revenue_range',
      company.annual_revenue_range,
      'Contractor'
    );
  }
  
  // 3. Business Model Score (0-8 points) - Still uses percentages
  let businessModelScore = 0;
  
  if (company.maintenance_contract_percentage !== null && company.maintenance_contract_percentage !== undefined) {
    if (company.maintenance_contract_percentage >= 60) businessModelScore += 5;
    else if (company.maintenance_contract_percentage >= 40) businessModelScore += 4;
    else if (company.maintenance_contract_percentage >= 20) businessModelScore += 3;
    else if (company.maintenance_contract_percentage >= 10) businessModelScore += 2;
    else businessModelScore += 1;
  }
  
  if (company.emergency_service_percentage !== null && company.emergency_service_percentage !== undefined) {
    if (company.emergency_service_percentage < 20) businessModelScore += 3;
    else if (company.emergency_service_percentage < 40) businessModelScore += 2;
    else if (company.emergency_service_percentage < 60) businessModelScore += 1;
  }
  
  scoring.businessModelScore = Math.min(businessModelScore, 8);
  
  // 4. Geographic Score (0-10 points)
  scoring.geographicScore = calculateGeographicScore(company.state);
  
  // 5. Stability Score (0-8 points) - Employees (4pts) + Years (4pts)
  let stabilityScore = 0;
  
  // Employees component (0-4 points) - FROM RANGE
  if (company.total_employees_range) {
    const employeeScore = await getScoreForRange(
      'total_employees_range',
      company.total_employees_range,
      'Contractor'
    );
    stabilityScore += Math.min(employeeScore, 4);
  }
  
  // Years component (0-4 points) - FROM RANGE
  if (company.years_in_business_range) {
    const yearsScore = await getScoreForRange(
      'years_in_business_range',
      company.years_in_business_range,
      'Contractor'
    );
    stabilityScore += Math.min(yearsScore, 4);
  }
  
  scoring.stabilityScore = Math.min(stabilityScore, 8);

  scoring.firmographicTotal = 
    scoring.volumeScore +
    scoring.revenueScore +
    scoring.businessModelScore +
    scoring.geographicScore +
    scoring.stabilityScore;

  // ============================================
  // DIGITAL ENGAGEMENT (30 points)
  // ============================================
  
  // 1. Website Quality (0-10 points) - FROM RANGE
  if (company.website_quality) {
    scoring.websiteQualityScore = await getScoreForRange(
      'website_quality',
      company.website_quality,
      'Contractor'
    );
  }
  
  // 2. LinkedIn Activity (0-10 points) - FROM RANGE
  if (company.linkedin_activity_level) {
    scoring.linkedinActivityScore = await getScoreForRange(
      'linkedin_activity_level',
      company.linkedin_activity_level,
      'Contractor'
    );
  }
  
  // 3. Technology Adoption (0-10 points)
  let techScore = 0;
  if (company.technology_adoption_level) {
    techScore = await getScoreForRange(
      'technology_adoption_level',
      company.technology_adoption_level,
      'Contractor'
    );
  } else if (company.nest_installation_volume_range) {
    techScore = await getScoreForRange(
      'nest_installation_volume_range',
      company.nest_installation_volume_range,
      'Contractor'
    );
  }
  
  scoring.technologyAdoptionScore = Math.min(techScore, 10);
  
  scoring.digitalTotal = 
    scoring.websiteQualityScore +
    scoring.linkedinActivityScore +
    scoring.technologyAdoptionScore;

  // ============================================
  // CONTACT QUALITY (20 points)
  // ============================================
  
  let maxRoleScore = 0;
  let maxLinkedInScore = 0;
  
  if (company.contacts && company.contacts.length > 0) {
    const titleScores: Record<string, number> = {
      'CEO': 10, 'President': 10, 'Owner': 10, 'Founder': 10,
      'COO': 10, 'CFO': 10, 'CMO': 10, 'CTO': 10,
      'VP': 8, 'Vice President': 8,
      'Director': 6,
      'Manager': 4
    };

    company.contacts.forEach((contact: any) => {
      const title = (contact.title || '').toUpperCase();
      for (const [keyword, score] of Object.entries(titleScores)) {
        if (title.includes(keyword.toUpperCase())) {
          maxRoleScore = Math.max(maxRoleScore, score);
        }
      }
      
      let contactLinkedInScore = 0;
      if (contact.linkedin_url) {
        contactLinkedInScore += 3;
        
        if (contact.linkedin_connections >= 1000) contactLinkedInScore += 4;
        else if (contact.linkedin_connections >= 500) contactLinkedInScore += 3;
        else if (contact.linkedin_connections >= 250) contactLinkedInScore += 2;
        else if (contact.linkedin_connections >= 100) contactLinkedInScore += 1;
        
        if (contact.linkedin_activity_score >= 80) contactLinkedInScore += 3;
        else if (contact.linkedin_activity_score >= 50) contactLinkedInScore += 2;
        else if (contact.linkedin_activity_score >= 20) contactLinkedInScore += 1;
      }
      
      maxLinkedInScore = Math.max(maxLinkedInScore, contactLinkedInScore);
    });
  }
  
  scoring.decisionAuthorityScore = maxRoleScore;
  scoring.linkedinProfessionalScore = Math.min(maxLinkedInScore, 10);
  
  scoring.contactTotal = 
    scoring.decisionAuthorityScore +
    scoring.linkedinProfessionalScore;

  // ============================================
  // TOTAL SCORE
  // ============================================
  
  scoring.totalScore = 
    scoring.firmographicTotal +
    scoring.digitalTotal +
    scoring.contactTotal;

  scoring.priorityTier = assignPriorityTier(scoring.totalScore);
  scoring.confidence = calculateConfidence(company);

  await saveContractorScore(companyId, scoring);

  await supabase
    .from('companies')
    .update({
      lead_score: scoring.totalScore,
      priority_tier: scoring.priorityTier,
      segment_confidence: scoring.confidence,
      score_calculated_at: new Date().toISOString()
    } as any)
    .eq('id', companyId);

  return scoring;
}

async function saveContractorScore(companyId: string, scoring: ContractorScoringBreakdown) {
  await supabase
    .from('contractor_scoring_details')
    .upsert(
      {
        company_id: companyId,
        volume_score: scoring.volumeScore,
        revenue_score: scoring.revenueScore,
        business_model_score: scoring.businessModelScore,
        geographic_score: scoring.geographicScore,
        stability_score: scoring.stabilityScore,
        firmographic_total: scoring.firmographicTotal,
        website_quality_score: scoring.websiteQualityScore,
        social_media_score: scoring.linkedinActivityScore,
        technology_adoption_score: scoring.technologyAdoptionScore,
        digital_total: scoring.digitalTotal,
        decision_authority_score: scoring.decisionAuthorityScore,
        linkedin_professional_score: scoring.linkedinProfessionalScore,
        contact_total: scoring.contactTotal,
        total_score: scoring.totalScore,
        priority_tier: scoring.priorityTier,
        confidence: scoring.confidence,
        calculated_at: new Date().toISOString()
      },
      { onConflict: 'company_id' }
    );
}
