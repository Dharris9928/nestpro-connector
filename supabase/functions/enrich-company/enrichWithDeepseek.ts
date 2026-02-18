// Deepseek enrichment function
export async function enrichWithDeepseek(company: any, deepEnrich: boolean) {
  const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }
  
  const prompt = deepEnrich
    ? `Perform DEEP COMPREHENSIVE analysis of this company with PRIORITY on business metrics and digital engagement:

Company: ${company.company_name}
Industry: ${company.industry_type}
Website: ${company.website_url || 'Not provided'}
LinkedIn: ${company.linkedin_company_url || 'Not provided'}
Current data: ${JSON.stringify(company, null, 2)}

CRITICAL PRIORITIES - Research and fill ALL possible fields:

**BUSINESS METRICS (HIGHEST PRIORITY):**
- Exact employee count and company size
- Specific annual revenue range
- Years in business (calculate from founding)
- Annual installation/project volume
- Average project/home price
- Price positioning (economy/mid-market/premium/luxury)
- Revenue growth trend (year-over-year analysis)
- Profitability level and margins
- Overall financial health assessment

**FINANCIAL STABILITY RUBRIC (BINARY ASSESSMENT - YES/NO):**
- Revenue Growth Indicators - Look for: expansion, new communities, market entry, new locations, increased capacity (5 pts if YES)
- Multiple Active Projects - Look for: multiple active communities/projects simultaneously (5 pts if YES)
- Industry Awards/Recognition - Look for: builder awards, national rankings, certifications (3 pts if YES)
- Positive Reviews/Reputation - Look for: BBB A- or higher, OR 4+ stars, OR strong testimonials (2 pts if YES)

**DIGITAL ENGAGEMENT (HIGHEST PRIORITY):**
- Website quality, professionalism, content depth
- Smart home/technology content on website
- LinkedIn followers, activity, and engagement
- Facebook, Instagram, YouTube presence and URLs
- Social media activity patterns
- Technology adoption indicators
- Google Business Profile status
- Online review ratings and volume

**DEEP ANALYSIS:**
- Executive team and decision-makers
- Recent news and growth signals
- Competitive positioning and advantages
- Market trends and opportunities
- Partnership potential
- Strategic recommendations

Research extensively using provided URLs and public information.`
    : `Analyze and COMPREHENSIVELY enrich this company data with FOCUS on business metrics and digital engagement:

Company: ${company.company_name}
Industry: ${company.industry_type}
Website: ${company.website_url || 'Not provided'}
LinkedIn: ${company.linkedin_company_url || 'Not provided'}
Current data: ${JSON.stringify(company, null, 2)}

PRIORITIES:
1. Business metrics: employees, revenue, years in business, volume, pricing, growth trends, profitability, financial health
2. Digital engagement: website quality, social media URLs and activity, LinkedIn presence, online reviews
3. Technology adoption and smart home readiness

Fill as many fields as possible with accurate data.`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a B2B data enrichment specialist. Extract and structure company information accurately using the provided tool.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'enrich_company_data',
          description: 'Structure comprehensive enriched company data with priority on business metrics and digital engagement',
          parameters: {
            type: 'object',
            properties: {
              // Business Metrics
              total_employees: { type: 'integer', description: 'Exact employee count' },
              total_employees_range: { type: 'string', enum: ['1-5', '6-10', '11-25', '26-50', '51-100', '101-250', '251-500', '500+'] },
              annual_revenue_range: { type: 'string', enum: ['<$500K', '$500K-$999K', '$1M-$2.9M', '$3M-$5.9M', '$6M-$10M', '$10M+'] },
              years_in_business: { type: 'integer' },
              years_in_business_range: { type: 'string', enum: ['<5', '5-10', '11-20', '21-30', '30+'] },
              annual_volume: { type: 'integer' },
              annual_volume_range: { type: 'string', enum: ['<100', '100-249', '250-499', '500-749', '750-999', '1,000-1,499', '1,500-1,999', '2,000-2,999', '3,000-4,999', '5,000-9,999', '10,000+'] },
              average_home_price: { type: 'integer' },
              average_home_price_range: { type: 'string', enum: ['<$150K', '$150K-$199K', '$200K-$249K', '$250K-$299K', '$300K-$399K', '$400K-$499K', '$500K-$599K', '$600K-$799K', '$800K-$999K', '$1M-$1.49M', '$1.5M-$1.99M', '$2M-$2.99M', '$3M+'] },
              price_point_category: { type: 'string', enum: ['economy', 'mid-market', 'premium', 'luxury'] },
              
              // Financial Stability Indicators
              revenue_growth_trend: { type: 'string', enum: ['Rapid Growth (>20% YoY)', 'Strong Growth (10-20% YoY)', 'Moderate Growth (5-10% YoY)', 'Stable (0-5% YoY)', 'Declining (<0% YoY)', 'Unknown'] },
              profitability_level: { type: 'string', enum: ['Highly Profitable (>15% margin)', 'Profitable (8-15% margin)', 'Moderately Profitable (5-8% margin)', 'Break-even (0-5% margin)', 'Unprofitable (<0% margin)', 'Unknown'] },
              financial_health_rating: { type: 'string', enum: ['Excellent', 'Good', 'Fair', 'Poor', 'At Risk', 'Unknown'] },
              
              // Financial Stability Rubric (Binary YES/NO assessments)
              revenue_growth_indicators: { type: 'boolean', description: 'Evidence of expansion, new markets, increased capacity' },
              multiple_active_projects: { type: 'boolean', description: 'Multiple active communities/projects simultaneously' },
              industry_awards_recognition: { type: 'boolean', description: 'Has received industry awards or recognition' },
              positive_reviews_reputation: { type: 'boolean', description: 'BBB A- or higher, OR 4+ stars, OR strong testimonials' },
              
              // Digital Engagement
              website_url: { type: 'string' },
              website_quality: { type: 'string', enum: ['None', 'Poor', 'Basic', 'Good', 'Professional'] },
              website_has_smart_home_content: { type: 'boolean' },
              website_last_updated: { type: 'string', enum: ['Recently', 'Within 6 months', 'Within 1 year', 'Over 1 year', 'Unknown'] },
              
              linkedin_company_url: { type: 'string' },
              linkedin_followers_range: { type: 'string', enum: ['No page', '<500', '500-1K', '1K-5K', '5K-10K', '10K+'] },
              linkedin_activity_level: { type: 'string', enum: ['None', 'Low', 'Moderate', 'Active', 'Very Active'] },
              
              facebook_url: { type: 'string' },
              instagram_url: { type: 'string' },
              youtube_url: { type: 'string' },
              social_media_presence: { type: 'string', enum: ['None', 'Limited', 'Moderate', 'Active', 'Very Active'] },
              
              technology_adoption_level: { type: 'string', enum: ['Traditional', 'Late Adopter', 'Mainstream', 'Early Adopter', 'Industry Leader'] },
              has_google_business_profile: { type: 'boolean' },
              online_review_rating: { type: 'number' },
              online_review_count_range: { type: 'string', enum: ['None', '<10', '10-24', '25-49', '50-99', '100+'] },
              
              // Location & Contact
              city: { type: 'string', description: 'City where company is headquartered' },
              state: { type: 'string', description: 'State abbreviation (2-letter code)' },
              address_line1: { type: 'string', description: 'Street address of headquarters' },
              zip: { type: 'string', description: 'ZIP/postal code' },
              owner_name: { type: 'string', description: 'Owner or CEO name' },
              primary_phone: { type: 'string', description: 'Main business phone number' },
              primary_email: { type: 'string', description: 'Main business email address' },
              contractor_specialty: { type: 'string', enum: ['HVAC', 'Plumbing', 'Electrical', 'General', 'Mechanical', 'Solar', 'Roofing'], description: 'Primary contractor specialty' },
              service_area_type: { type: 'string', enum: ['Local', 'Regional', 'Statewide', 'Multi-State', 'National'], description: 'Geographic service coverage' },
              
              // AI Insights
              market_positioning: { type: 'string' },
              competitive_advantages: { type: 'array', items: { type: 'string' } },
              growth_indicators: { type: 'array', items: { type: 'string' } },
              smart_home_readiness_score: { type: 'integer', minimum: 0, maximum: 100 },
              recommended_approach: { type: 'string' },
              confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] }
            }
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'enrich_company_data' } }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepseek API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const toolCall = data.choices[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    throw new Error('No structured data returned from Deepseek');
  }

  const enrichedData = JSON.parse(toolCall.function.arguments);

  // Build company updates - only include fields that have values
  const companyUpdates: any = {};
  
  // Business metrics
  if (enrichedData.total_employees) companyUpdates.total_employees = enrichedData.total_employees;
  if (enrichedData.total_employees_range) companyUpdates.total_employees_range = enrichedData.total_employees_range;
  if (enrichedData.annual_revenue_range) companyUpdates.annual_revenue_range = enrichedData.annual_revenue_range;
  if (enrichedData.years_in_business) companyUpdates.years_in_business = enrichedData.years_in_business;
  if (enrichedData.years_in_business_range) companyUpdates.years_in_business_range = enrichedData.years_in_business_range;
  if (enrichedData.annual_volume) companyUpdates.annual_volume = enrichedData.annual_volume;
  if (enrichedData.annual_volume_range) companyUpdates.annual_volume_range = enrichedData.annual_volume_range;
  if (enrichedData.average_home_price) companyUpdates.average_home_price = enrichedData.average_home_price;
  if (enrichedData.average_home_price_range) companyUpdates.average_home_price_range = enrichedData.average_home_price_range;
  if (enrichedData.price_point_category) companyUpdates.price_point_category = enrichedData.price_point_category;
  
  // Financial stability indicators
  if (enrichedData.revenue_growth_trend && enrichedData.revenue_growth_trend !== 'Unknown') companyUpdates.revenue_growth_trend = enrichedData.revenue_growth_trend;
  if (enrichedData.profitability_level && enrichedData.profitability_level !== 'Unknown') companyUpdates.profitability_level = enrichedData.profitability_level;
  if (enrichedData.financial_health_rating && enrichedData.financial_health_rating !== 'Unknown') companyUpdates.financial_health_rating = enrichedData.financial_health_rating;
  
  // Financial Stability Rubric (Binary)
  if (enrichedData.revenue_growth_indicators !== undefined) companyUpdates.revenue_growth_indicators = enrichedData.revenue_growth_indicators;
  if (enrichedData.multiple_active_projects !== undefined) companyUpdates.multiple_active_projects = enrichedData.multiple_active_projects;
  if (enrichedData.industry_awards_recognition !== undefined) companyUpdates.industry_awards_recognition = enrichedData.industry_awards_recognition;
  if (enrichedData.positive_reviews_reputation !== undefined) companyUpdates.positive_reviews_reputation = enrichedData.positive_reviews_reputation;
  
  // Digital engagement
  if (enrichedData.website_url) companyUpdates.website_url = enrichedData.website_url;
  if (enrichedData.website_quality) companyUpdates.website_quality = enrichedData.website_quality;
  if (enrichedData.website_has_smart_home_content !== undefined) companyUpdates.website_has_smart_home_content = enrichedData.website_has_smart_home_content;
  if (enrichedData.website_last_updated) companyUpdates.website_last_updated = enrichedData.website_last_updated;
  
  if (enrichedData.linkedin_company_url) companyUpdates.linkedin_company_url = enrichedData.linkedin_company_url;
  if (enrichedData.linkedin_followers_range) companyUpdates.linkedin_followers_range = enrichedData.linkedin_followers_range;
  if (enrichedData.linkedin_activity_level) companyUpdates.linkedin_activity_level = enrichedData.linkedin_activity_level;
  
  if (enrichedData.facebook_url) companyUpdates.facebook_url = enrichedData.facebook_url;
  if (enrichedData.instagram_url) companyUpdates.instagram_url = enrichedData.instagram_url;
  if (enrichedData.youtube_url) companyUpdates.youtube_url = enrichedData.youtube_url;
  if (enrichedData.social_media_presence) companyUpdates.social_media_presence = enrichedData.social_media_presence;
  
  if (enrichedData.technology_adoption_level) {
    const normalizeTechAdoption = (value: any): string | undefined => {
      if (value === undefined || value === null) return undefined;
      const v = String(value).trim().toLowerCase();
      const map: Record<string, string> = {
        'laggard': 'Traditional',
        'conservative': 'Late Adopter',
        'mainstream': 'Mainstream',
        'progressive': 'Early Adopter',
        'early adopter': 'Early Adopter',
        'industry leader': 'Industry Leader',
        'traditional': 'Traditional',
        'late adopter': 'Late Adopter',
      };
      return map[v] ?? undefined;
    };
    
    const tech = normalizeTechAdoption(enrichedData.technology_adoption_level);
    if (tech) companyUpdates.technology_adoption_level = tech;
  }
  if (enrichedData.has_google_business_profile !== undefined) companyUpdates.has_google_business_profile = enrichedData.has_google_business_profile;
  if (enrichedData.online_review_rating) companyUpdates.online_review_rating = enrichedData.online_review_rating;
  if (enrichedData.online_review_count_range) companyUpdates.online_review_count_range = enrichedData.online_review_count_range;

  // Location & Contact
  if (enrichedData.city) companyUpdates.city = enrichedData.city;
  if (enrichedData.state) companyUpdates.state = enrichedData.state;
  if (enrichedData.address_line1) companyUpdates.address_line1 = enrichedData.address_line1;
  if (enrichedData.zip) companyUpdates.zip = enrichedData.zip;
  if (enrichedData.owner_name) companyUpdates.owner_name = enrichedData.owner_name;
  if (enrichedData.primary_phone) companyUpdates.primary_phone = enrichedData.primary_phone;
  if (enrichedData.primary_email) companyUpdates.primary_email = enrichedData.primary_email;
  if (enrichedData.contractor_specialty) companyUpdates.contractor_specialty = enrichedData.contractor_specialty;
  if (enrichedData.service_area_type) companyUpdates.service_area_type = enrichedData.service_area_type;

  return {
    companyUpdates,
    insights: {
      market_positioning: enrichedData.market_positioning,
      competitive_advantages: enrichedData.competitive_advantages,
      growth_indicators: enrichedData.growth_indicators,
      smart_home_readiness_score: enrichedData.smart_home_readiness_score,
      recommended_approach: enrichedData.recommended_approach,
      confidence_level: enrichedData.confidence_level
    },
    confidence: enrichedData.confidence_level === 'high' ? 88 : enrichedData.confidence_level === 'medium' ? 73 : 52,
    fieldsEnriched: Object.keys(companyUpdates)
  };
}
