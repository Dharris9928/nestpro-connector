import { supabase } from '@/integrations/supabase/client';

/**
 * Shared scoring functions used by both Builder and Contractor scoring
 */

// ============================================
// DIGITAL ENGAGEMENT SCORING (30 points)
// ============================================

export function calculateWebsiteScore(websiteUrl?: string): number {
  if (!websiteUrl) return 0;
  
  // Rubric: 5pts for professional site, 3pts for smart home mentions, 2pts for updates
  // Without crawling, we give base score for having a professional domain
  // Enhanced scoring would require website analysis
  return 5; // Base score for having a website (assumes professional if builder has site)
}

export function calculateSocialMediaScore(linkedinUrl?: string): number {
  if (!linkedinUrl) return 0;
  
  // Rubric: 4pts active LinkedIn, 3pts recent posts, 2pts thought leadership, 1pt 500+ followers
  // Without API access, we give base score for having LinkedIn presence
  // Enhanced scoring would require LinkedIn API integration
  return 4; // Base score for having LinkedIn company page
}

export function calculateTechnologyScore(installations: any[]): number {
  if (!installations || installations.length === 0) return 0;

  let score = 0;
  
  // Rubric: 7pts for smart home offerings, 2pts for energy efficiency, 1pt for modern construction
  // Using installation history as indicator of smart home adoption
  
  if (installations.length > 0) {
    score += 7; // Has smart home offerings (proven by installations)
  }
  
  // Check for recent/active adoption (proxy for ongoing commitment)
  const recentInstalls = installations.filter(i => {
    const installDate = new Date(i.installation_date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return installDate >= oneYearAgo;
  });
  
  if (recentInstalls.length > 0) {
    score += 2; // Active/recent = likely energy efficiency focus
  }
  
  // If multiple product types, shows innovation/modern methods
  const uniqueProducts = new Set(installations.map(i => i.product_type));
  if (uniqueProducts.size > 1) {
    score += 1; // Diverse product adoption = modern construction methods
  }

  return Math.min(score, 10);
}

// ============================================
// CONTACT SCORING (20 points)
// ============================================

export function calculateDecisionAuthorityScore(contacts: any[]): number {
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

export function calculateLinkedInScore(contacts: any[]): number {
  if (!contacts || contacts.length === 0) return 0;

  let maxScore = 0;

  // Rubric: 4pts for 1,000+ connections, 3pts for recent posts, 2pts for groups, 1pt for speaking
  for (const contact of contacts) {
    let score = 0;
    
    if (contact.linkedin_url) {
      // Connection count scoring
      if (contact.linkedin_connections) {
        if (contact.linkedin_connections >= 1000) score += 4; // Well-networked
        else if (contact.linkedin_connections >= 500) score += 3; // Active networker
        else if (contact.linkedin_connections >= 200) score += 2; // Growing network
        else score += 1; // Present on LinkedIn
      }
      
      // LinkedIn activity score (if available)
      if (contact.linkedin_activity_score) {
        if (contact.linkedin_activity_score >= 80) score += 3; // Active engagement
        else if (contact.linkedin_activity_score >= 50) score += 2; // Moderate activity
        else if (contact.linkedin_activity_score >= 20) score += 1; // Some activity
      }
    }
    
    maxScore = Math.max(maxScore, score);
  }

  return Math.min(maxScore, 10);
}

// ============================================
// CONFIDENCE CALCULATION
// ============================================

export function calculateConfidence(company: any): 'High' | 'Medium' | 'Low' {
  let dataPoints = 0;

  // Count available data points
  if (company.annual_volume > 0) dataPoints++;
  if (company.annual_revenue_range) dataPoints++;
  if (company.website_url) dataPoints++;
  if (company.linkedin_company_url) dataPoints++;
  if (company.contacts?.length > 0) dataPoints++;
  if (company.installations?.length > 0) dataPoints++;
  if (company.city) dataPoints++;
  if (company.years_in_business) dataPoints++;

  const completeness = (dataPoints / 8) * 100;

  if (completeness >= 90) return 'High';
  if (completeness >= 70) return 'Medium';
  return 'Low';
}

// Map simple confidence to database format
export function mapConfidenceToDbFormat(confidence: 'High' | 'Medium' | 'Low'): 'High 90%+' | 'Medium 70-89%' | 'Low <70%' {
  switch (confidence) {
    case 'High':
      return 'High 90%+';
    case 'Medium':
      return 'Medium 70-89%';
    case 'Low':
      return 'Low <70%';
  }
}

// ============================================
// GEOGRAPHIC SCORING
// ============================================

export function calculateGeographicScore(state?: string): number {
  if (!state) return 0;

  // Primary Sun Belt markets
  const primaryMarkets = ['TX', 'FL', 'NC', 'AZ', 'GA', 'TN'];
  if (primaryMarkets.includes(state.toUpperCase())) return 10;

  // Secondary growth markets
  const secondaryMarkets = ['CO', 'UT', 'VA', 'SC', 'NV', 'ID'];
  if (secondaryMarkets.includes(state.toUpperCase())) return 7;

  // All other locations
  return 4;
}

// ============================================
// PRIORITY TIER ASSIGNMENT
// ============================================

export function assignPriorityTier(totalScore: number): 'P1' | 'P2' | 'P3' | 'Unscored' {
  if (totalScore >= 70) return 'P1';
  if (totalScore >= 45) return 'P2';
  if (totalScore >= 20) return 'P3';
  return 'Unscored';
}
