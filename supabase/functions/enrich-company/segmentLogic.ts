// Automatic segment assignment based on enriched company data

interface SegmentCriteria {
  name: string;
  industryType: 'Builder' | 'Contractor';
  employeeMin?: number;
  employeeMax?: number;
  revenueMin?: number;  // in millions
  revenueMax?: number;  // in millions
  keywords?: string[];
  priority: number; // Lower number = higher priority
}

const SEGMENT_DEFINITIONS: SegmentCriteria[] = [
  // Builder Segments
  {
    name: 'production_tract',
    industryType: 'Builder',
    employeeMin: 201,
    employeeMax: 1000,
    revenueMin: 50,
    revenueMax: 100,
    priority: 1
  },
  {
    name: 'luxury_custom',
    industryType: 'Builder',
    employeeMin: 51,
    employeeMax: 500,
    revenueMin: 10,
    revenueMax: 50,
    keywords: ['luxury', 'custom', 'premium', 'high-end'],
    priority: 2
  },
  {
    name: 'regional_mid_volume',
    industryType: 'Builder',
    employeeMin: 51,
    employeeMax: 200,
    revenueMin: 10,
    revenueMax: 50,
    priority: 3
  },
  {
    name: 'multi_family',
    industryType: 'Builder',
    employeeMin: 51,
    employeeMax: 500,
    revenueMin: 10,
    keywords: ['multi-family', 'apartment', 'multifamily'],
    priority: 4
  },
  
  // Contractor Segments
  {
    name: 'smart_home_champions',
    industryType: 'Contractor',
    employeeMin: 11,
    employeeMax: 200,
    revenueMin: 1,
    revenueMax: 10,
    keywords: ['smart home', 'automation', 'technology', 'connected', 'iot'],
    priority: 1
  },
  {
    name: 'premium_specialists',
    industryType: 'Contractor',
    employeeMin: 11,
    employeeMax: 100,
    revenueMin: 1,
    revenueMax: 10,
    keywords: ['premium', 'luxury', 'high-end', 'upscale'],
    priority: 2
  },
  {
    name: 'regional_growth',
    industryType: 'Contractor',
    employeeMin: 11,
    employeeMax: 50,
    revenueMin: 1,
    revenueMax: 10,
    priority: 3
  },
  {
    name: 'high_volume',
    industryType: 'Contractor',
    employeeMin: 25,
    employeeMax: 200,
    revenueMin: 3,
    revenueMax: 10,
    priority: 4
  }
];

function parseRevenueRange(revenueRange: string | null): number | null {
  if (!revenueRange) return null;
  
  // Extract the lower bound of the range and convert to millions
  const ranges: Record<string, number> = {
    '<$500K': 0.25,
    '$500K-$999K': 0.75,
    '$1M-$2.9M': 2,
    '$3M-$5.9M': 4.5,
    '$6M-$10M': 8,
    '$10M+': 15,
    '$10M-$50M': 30,
    '$50M-$100M': 75,
    '$100M+': 150
  };
  
  return ranges[revenueRange] || null;
}

function matchesKeywords(company: any, updates: any, keywords: string[]): boolean {
  const textFields = [
    company.company_name,
    company.notes,
    company.website_url,
    company.contractor_specialty,
    updates.company_name,
    updates.notes,
    updates.website_url,
    updates.contractor_specialty
  ].filter(Boolean).join(' ').toLowerCase();
  
  return keywords.some(keyword => textFields.includes(keyword.toLowerCase()));
}

export function determineSegment(company: any, updates: any): string | null {
  const industryType = updates.industry_type || company.industry_type;
  if (!industryType) return null;
  
  // Get enriched employee count
  const employees = updates.total_employees || company.total_employees;
  
  // Get enriched revenue (in millions)
  const revenueRange = updates.annual_revenue_range || company.annual_revenue_range;
  const revenue = parseRevenueRange(revenueRange);
  
  console.log(`Segment matching - Industry: ${industryType}, Employees: ${employees}, Revenue: ${revenue}M`);
  
  // Filter segments by industry type and sort by priority
  const matchingSegments = SEGMENT_DEFINITIONS
    .filter(seg => seg.industryType === industryType)
    .sort((a, b) => a.priority - b.priority);
  
  // Find the best matching segment
  for (const segment of matchingSegments) {
    let matches = true;
    
    // Check employee count
    if (employees) {
      if (segment.employeeMin && employees < segment.employeeMin) matches = false;
      if (segment.employeeMax && employees > segment.employeeMax) matches = false;
    }
    
    // Check revenue
    if (revenue && matches) {
      if (segment.revenueMin && revenue < segment.revenueMin) matches = false;
      if (segment.revenueMax && revenue > segment.revenueMax) matches = false;
    }
    
    // Check keywords (optional, adds specificity)
    if (matches && segment.keywords && segment.keywords.length > 0) {
      const keywordMatch = matchesKeywords(company, updates, segment.keywords);
      // Keywords are a bonus for specific segments, but not required
      if (keywordMatch) {
        console.log(`Matched segment: ${segment.name} (with keywords)`);
        return segment.name;
      }
    }
    
    // If all required criteria match (even without keywords)
    if (matches && (employees || revenue)) {
      console.log(`Matched segment: ${segment.name}`);
      return segment.name;
    }
  }
  
  // Default fallback based on size if no specific match
  if (employees) {
    if (industryType === 'Builder') {
      if (employees >= 201) return 'production_tract';
      if (employees >= 51) return 'regional_mid_volume';
      return 'spec_home'; // Small builders
    } else if (industryType === 'Contractor') {
      if (employees >= 50) return 'premium_specialists';
      if (employees >= 25) return 'high_volume';
      if (employees >= 11) return 'regional_growth';
    }
  }
  
  console.log('No segment match found');
  return null;
}
