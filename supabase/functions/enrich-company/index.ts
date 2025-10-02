import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize various enum-like values to database-accepted values
function normalizeTechAdoption(value: any): string | undefined {
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, deepEnrich = false, previewOnly = false } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'companyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user and get company
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check company access
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting enrichment for company: ${company.company_name} (${companyId})`);

    let enrichmentResult;
    let provider = 'lovable_ai';
    let fallbackUsed = false;

    // First, try Apollo for accurate business data
    let apolloData = null;
    try {
      console.log('Attempting Apollo enrichment first for business metrics...');
      const apolloResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/apollo-enrich`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: company.company_name,
          websiteUrl: company.website_url,
          linkedinUrl: company.linkedin_company_url
        })
      });

      if (apolloResponse.ok) {
        const apolloResult = await apolloResponse.json();
        if (apolloResult.found) {
          apolloData = apolloResult;
          console.log(`Apollo found data: ${apolloResult.fieldsEnriched?.length || 0} fields`);
        }
      }
    } catch (error) {
      console.log('Apollo enrichment skipped:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Try Lovable AI (Gemini) for comprehensive enrichment
    if (!deepEnrich) {
      try {
        enrichmentResult = await enrichWithLovableAI(company);
        console.log('Lovable AI enrichment successful');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Lovable AI failed, falling back to Claude:', errorMessage);
        fallbackUsed = true;
      }
    }

    // Use Claude for deep enrichment or if Lovable AI failed
    if (deepEnrich || fallbackUsed) {
      provider = 'claude';
      try {
        enrichmentResult = await enrichWithClaude(company, deepEnrich);
        console.log('Claude enrichment successful');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Claude enrichment failed:', errorMessage);
        
        // Log failure
        await supabase.from('enrichment_logs').insert({
          company_id: companyId,
          provider,
          enrichment_type: deepEnrich ? 'deep' : 'standard',
          status: 'failed',
          error_message: errorMessage,
          created_by: user.id
        });

        return new Response(
          JSON.stringify({ error: 'Enrichment failed', details: errorMessage }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!enrichmentResult) {
      return new Response(
        JSON.stringify({ error: 'No enrichment result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge Apollo data with AI enrichment (Apollo takes precedence for business metrics)
    if (apolloData && apolloData.companyUpdates) {
      console.log('Merging Apollo business data with AI enrichment...');
      enrichmentResult.companyUpdates = {
        ...enrichmentResult.companyUpdates,
        ...apolloData.companyUpdates  // Apollo data overwrites AI data for business metrics
      };
      enrichmentResult.fieldsEnriched = Array.from(new Set([
        ...enrichmentResult.fieldsEnriched,
        ...apolloData.fieldsEnriched
      ]));
    }

    // If preview mode, return what would be changed without updating
    if (previewOnly) {
      const fieldsToOverwrite: Record<string, { current: any; new: any }> = {};
      
      for (const [key, newValue] of Object.entries(enrichmentResult.companyUpdates)) {
        const currentValue = company[key];
        if (currentValue !== null && currentValue !== undefined && currentValue !== '' && newValue !== currentValue) {
          fieldsToOverwrite[key] = { current: currentValue, new: newValue };
        }
      }

      return new Response(
        JSON.stringify({
          preview: true,
          provider,
          confidence: enrichmentResult.confidence,
          fieldsEnriched: enrichmentResult.fieldsEnriched,
          fieldsToOverwrite,
          companyUpdates: enrichmentResult.companyUpdates,
          insights: enrichmentResult.insights
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize and sanitize updates (trim strings, fix URLs)
    const sanitize = (obj: Record<string, any>) => {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        if (typeof v === 'string') {
          out[k] = v.trim();
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    let updates = sanitize(enrichmentResult.companyUpdates);

    // If nothing to update, still log and return success
    if (Object.keys(updates).length === 0) {
      await supabase.from('enrichment_logs').insert({
        company_id: companyId,
        provider,
        enrichment_type: deepEnrich ? 'deep' : 'standard',
        status: 'success',
        confidence_score: enrichmentResult.confidence,
        fields_enriched: [],
        created_by: user.id
      });
      return new Response(
        JSON.stringify({ success: true, provider, apolloEnriched: !!apolloData, confidence: enrichmentResult.confidence, fieldsEnriched: [], insights: enrichmentResult.insights, scoreRecalculationTriggered: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Attempt update with graceful degradation for constraint failures
    let persistedRow: any = null;
    let failedFields: string[] = [];
    const tryUpdate = async () => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId)
        .select('*')
        .single();
      return { data, error };
    };

    let { data: updatedCompany, error: updateError } = await tryUpdate();

    // Handle constraint failures by iteratively removing problematic fields
    const maxRetries = Object.keys(updates).length;
    let retryCount = 0;
    
    while (updateError && retryCount < maxRetries) {
      const msg = (updateError as any).message || '';
      console.error(`Update failed (attempt ${retryCount + 1}):`, msg);
      
      // Check if it's a constraint violation
      if (msg.includes('violates check constraint') || (updateError as any).code === '23514') {
        // Extract constraint name if possible
        const constraintMatch = msg.match(/constraint "([^"]+)"/);
        const constraintName = constraintMatch ? constraintMatch[1] : 'unknown';
        console.log(`Constraint violation detected: ${constraintName}`);
        
        // Try to identify and remove the problematic field
        // Common patterns: companies_fieldname_check
        const fieldMatch = constraintName.match(/companies_([^_]+(?:_[^_]+)*)_check/);
        let removedField = false;
        
        if (fieldMatch && fieldMatch[1] in updates) {
          const fieldName = fieldMatch[1];
          console.log(`Removing field '${fieldName}' due to constraint violation`);
          failedFields.push(fieldName);
          delete updates[fieldName];
          removedField = true;
        } else {
          // If we can't identify the field, try removing fields one by one
          const remainingFields = Object.keys(updates).filter(f => !failedFields.includes(f));
          if (remainingFields.length > 0) {
            const fieldToRemove = remainingFields[0];
            console.log(`Cannot identify problematic field, removing '${fieldToRemove}' and retrying`);
            failedFields.push(fieldToRemove);
            delete updates[fieldToRemove];
            removedField = true;
          }
        }
        
        if (!removedField || Object.keys(updates).length === 0) {
          break; // No more fields to remove
        }
        
        // Retry the update
        const retry = await tryUpdate();
        updatedCompany = retry.data;
        updateError = retry.error as any;
        retryCount++;
      } else {
        // Not a constraint violation, break the loop
        break;
      }
    }

    if (updateError) {
      // Log failure with attempted fields
      await supabase.from('enrichment_logs').insert({
        company_id: companyId,
        provider,
        enrichment_type: deepEnrich ? 'deep' : 'standard',
        status: 'failed',
        confidence_score: enrichmentResult.confidence,
        fields_enriched: Object.keys(updates),
        error_message: (updateError as any).message || 'Update failed',
        created_by: user.id
      });

      return new Response(
        JSON.stringify({ error: 'Update failed', details: (updateError as any).message || 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    persistedRow = updatedCompany;

    // Upsert AI insights with proper conflict handling
    const { error: insightsError } = await supabase
      .from('company_ai_insights')
      .upsert({
        company_id: companyId,
        ...enrichmentResult.insights,
        enriched_by: user.id,
        last_enriched_at: new Date().toISOString()
      }, {
        onConflict: 'company_id'
      });

    if (insightsError) {
      console.error('Failed to save insights:', insightsError);
    }

    // Compute persisted fields: keys that exist in updates and changed from original company
    const persistedFields = Object.keys(updates).filter((key) => {
      return company[key] !== persistedRow[key];
    });

    // Store both field names AND values for potential manual re-application
    const enrichedDataWithValues: Record<string, any> = {};
    persistedFields.forEach((field) => {
      enrichedDataWithValues[field] = persistedRow[field];
    });

    // Log enrichment with persisted fields and their values
    await supabase.from('enrichment_logs').insert({
      company_id: companyId,
      provider,
      enrichment_type: deepEnrich ? 'deep' : 'standard',
      status: 'success',
      confidence_score: enrichmentResult.confidence,
      fields_enriched: enrichedDataWithValues,
      created_by: user.id
    });

    // Trigger score recalculation by updating company timestamp
    await supabase
      .from('companies')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', companyId);

    return new Response(
      JSON.stringify({
        success: true,
        provider,
        apolloEnriched: !!apolloData,
        confidence: enrichmentResult.confidence,
        fieldsEnriched: persistedFields,
        insights: enrichmentResult.insights,
        scoreRecalculationTriggered: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Enrichment error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function enrichWithLovableAI(company: any) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const prompt = `Analyze this company and provide COMPREHENSIVE enrichment data with PRIORITY on business metrics and digital engagement:

Company Name: ${company.company_name}
Industry: ${company.industry_type}
Website: ${company.website_url || 'Not provided'}
LinkedIn: ${company.linkedin_company_url || 'Not provided'}
Current Data: ${JSON.stringify(company, null, 2)}

CRITICAL PRIORITIES - Fill ALL possible fields:

**BUSINESS METRICS (HIGH PRIORITY):**
1. Company size (total_employees) - exact number if possible
2. Annual revenue range - be specific
3. Years in business - calculate from founding date
4. Annual installation/project volume
5. Average project/home price
6. Price point positioning (economy/mid-market/premium/luxury)
7. Revenue growth trend - assess year-over-year growth
8. Profitability level - estimate profit margins
9. Overall financial health rating

**FINANCIAL STABILITY RUBRIC (BINARY ASSESSMENT - YES/NO):**
10. Revenue Growth Indicators - Check for: expansion, new communities, market entry, new office locations, increased capacity (5 pts if YES)
11. Multiple Active Projects - Check for: multiple active communities/projects running simultaneously (5 pts if YES)
12. Industry Awards/Recognition - Check for: builder awards, national rankings, design awards, certifications (3 pts if YES)
13. Positive Reviews/Reputation - Check for: BBB A- or higher, OR 4+ stars average, OR strong testimonials (2 pts if YES)

**DIGITAL ENGAGEMENT (HIGH PRIORITY):**
1. Website quality and professionalism level
2. Website content about smart home/technology
3. LinkedIn company page followers and activity
4. Facebook, Instagram, YouTube presence
5. Social media activity level across platforms
6. Technology adoption indicators
7. Google Business Profile existence
8. Online review presence and ratings

**ADDITIONAL DATA:**
- Geographic market coverage
- Business model and service types
- Competitive positioning
- Growth indicators

Research the company thoroughly using the website and LinkedIn URLs provided. Be comprehensive and prioritize filling business and digital fields.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a B2B data enrichment specialist. Extract and structure company information accurately.' },
        { role: 'user', content: prompt }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'enrich_company_data',
          description: 'Structure comprehensive enriched company data with focus on business metrics and digital engagement',
          parameters: {
            type: 'object',
            properties: {
              // Business Metrics
              total_employees: { type: 'integer', description: 'Exact number of employees' },
              total_employees_range: { type: 'string', enum: ['1-5', '6-10', '11-25', '26-50', '51-100', '101-250', '251-500', '500+'] },
              annual_revenue_range: { type: 'string', enum: ['<$500K', '$500K-$999K', '$1M-$2.9M', '$3M-$5.9M', '$6M-$10M', '$10M+'] },
              years_in_business: { type: 'integer', description: 'Years company has been operating' },
              years_in_business_range: { type: 'string', enum: ['<5', '5-10', '11-20', '21-30', '30+'] },
              annual_volume: { type: 'integer', description: 'Annual installation/project volume' },
              annual_volume_range: { type: 'string', enum: ['<100', '100-249', '250-499', '500-749', '750-999', '1,000-1,499', '1,500-1,999', '2,000-2,999', '3,000-4,999', '5,000-9,999', '10,000+'] },
              average_home_price: { type: 'integer', description: 'Average project/home price in dollars' },
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
              website_url: { type: 'string', description: 'Company website if found' },
              website_quality: { type: 'string', enum: ['None', 'Poor', 'Basic', 'Good', 'Professional'] },
              website_has_smart_home_content: { type: 'boolean', description: 'Does website mention smart home/technology' },
              website_last_updated: { type: 'string', enum: ['Recently', 'Within 6 months', 'Within 1 year', 'Over 1 year', 'Unknown'] },
              
              linkedin_company_url: { type: 'string', description: 'LinkedIn company page URL if found' },
              linkedin_followers_range: { type: 'string', enum: ['No page', '<500', '500-1K', '1K-5K', '5K-10K', '10K+'] },
              linkedin_activity_level: { type: 'string', enum: ['None', 'Low', 'Moderate', 'Active', 'Very Active'] },
              
              facebook_url: { type: 'string', description: 'Facebook page URL if found' },
              instagram_url: { type: 'string', description: 'Instagram profile URL if found' },
              youtube_url: { type: 'string', description: 'YouTube channel URL if found' },
              social_media_presence: { type: 'string', enum: ['None', 'Limited', 'Moderate', 'Active', 'Very Active'] },
              
              technology_adoption_level: { type: 'string', enum: ['Traditional', 'Late Adopter', 'Mainstream', 'Early Adopter', 'Industry Leader'] },
              has_google_business_profile: { type: 'boolean', description: 'Company has Google Business Profile' },
              online_review_rating: { type: 'number', description: 'Average online review rating (0-5)' },
              online_review_count_range: { type: 'string', enum: ['None', '<10', '10-24', '25-49', '50-99', '100+'] },
              
              // AI Insights
              market_positioning: { type: 'string', description: 'How company positions itself in market' },
              competitive_advantages: { type: 'array', items: { type: 'string' } },
              growth_indicators: { type: 'array', items: { type: 'string' } },
              smart_home_readiness_score: { type: 'integer', minimum: 0, maximum: 100 },
              recommended_approach: { type: 'string', description: 'Recommended sales approach' },
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
    throw new Error(`Lovable AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const toolCall = data.choices[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    throw new Error('No structured data returned from Lovable AI');
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
    const tech = normalizeTechAdoption(enrichedData.technology_adoption_level);
    if (tech) companyUpdates.technology_adoption_level = tech;
  }
  if (enrichedData.has_google_business_profile !== undefined) companyUpdates.has_google_business_profile = enrichedData.has_google_business_profile;
  if (enrichedData.online_review_rating) companyUpdates.online_review_rating = enrichedData.online_review_rating;
  if (enrichedData.online_review_count_range) companyUpdates.online_review_count_range = enrichedData.online_review_count_range;

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
    confidence: enrichedData.confidence_level === 'high' ? 85 : enrichedData.confidence_level === 'medium' ? 70 : 50,
    fieldsEnriched: Object.keys(companyUpdates)
  };
}

async function enrichWithClaude(company: any, deepEnrich: boolean) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      tools: [{
        name: 'enrich_company_data',
        description: 'Structure comprehensive enriched company data with priority on business metrics and digital engagement',
        input_schema: {
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
            
            // AI Insights
            market_positioning: { type: 'string' },
            competitive_advantages: { type: 'array', items: { type: 'string' } },
            growth_indicators: { type: 'array', items: { type: 'string' } },
            smart_home_readiness_score: { type: 'integer', minimum: 0, maximum: 100 },
            recommended_approach: { type: 'string' },
            confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] }
          }
        }
      }],
      tool_choice: { type: 'tool', name: 'enrich_company_data' },
      messages: [{ role: 'user', content: prompt }]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const toolUse = data.content.find((c: any) => c.type === 'tool_use');
  
  if (!toolUse) {
    throw new Error('No structured data returned from Claude');
  }

  const enrichedData = toolUse.input;

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
    const tech = normalizeTechAdoption(enrichedData.technology_adoption_level);
    if (tech) companyUpdates.technology_adoption_level = tech;
  }
  if (enrichedData.has_google_business_profile !== undefined) companyUpdates.has_google_business_profile = enrichedData.has_google_business_profile;
  if (enrichedData.online_review_rating) companyUpdates.online_review_rating = enrichedData.online_review_rating;
  if (enrichedData.online_review_count_range) companyUpdates.online_review_count_range = enrichedData.online_review_count_range;

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
    confidence: enrichedData.confidence_level === 'high' ? 90 : enrichedData.confidence_level === 'medium' ? 75 : 55,
    fieldsEnriched: Object.keys(companyUpdates)
  };
}
