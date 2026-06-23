import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from '../_shared/rateLimiting.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  keywords: z.array(z.string().max(100)).max(20).optional(),
  industryKeywords: z.array(z.string().max(100)).max(20).optional(),
  employeeRange: z.string().max(50).optional(),
  revenueRange: z.string().max(50).optional(),
  states: z.array(z.string().max(100)).max(50).optional(),
  countries: z.array(z.string().max(100)).max(50).optional(),
  technologies: z.array(z.string().max(100)).max(50).optional(),
  buyingIntentStrength: z.string().max(50).optional(),
  buyingIntentTopics: z.array(z.string().max(100)).max(20).optional(),
  page: z.number().int().min(1).max(1000).optional().default(1)
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    if (!apolloApiKey) {
      throw new Error('APOLLO_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authentication required
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const rateLimitResponse = await checkRateLimit(supabase, user.id, 'apollo-company-search');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters',
          details: validation.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { 
      keywords,
      industryKeywords,
      employeeRange,
      revenueRange,
      states,
      countries,
      technologies,
      buyingIntentStrength,
      buyingIntentTopics,
      page
    } = validation.data;

    console.log('Apollo company search request:', { keywords, industryKeywords, employeeRange, revenueRange, states, technologies, page });

    // Build Apollo search query
    const searchPayload: any = {
      page,
      per_page: 25,
      organization_locations: [] as string[],
      organization_num_employees_ranges: [] as string[],
      revenue_range: {} as any,
      q_organization_keyword_tags: [] as string[]
    };

    // Add keywords
    if (keywords && keywords.length > 0) {
      searchPayload.q_organization_keyword_tags = keywords;
    }

    // Add industry keywords
    if (industryKeywords && industryKeywords.length > 0) {
      if (!searchPayload.q_organization_keyword_tags) {
        searchPayload.q_organization_keyword_tags = [];
      }
      searchPayload.q_organization_keyword_tags.push(...industryKeywords);
    }

    // Add location filter
    if (states && states.length > 0) {
      searchPayload.organization_locations = states;
    }

    // Add country filter
    if (countries && countries.length > 0) {
      searchPayload.organization_locations = countries;
    }

    // Add employee range
    if (employeeRange) {
      searchPayload.organization_num_employees_ranges = [employeeRange];
    }

    // Add revenue range
    if (revenueRange) {
      const revenueMap: any = {
        '1M-10M': { min: 1000000, max: 10000000 },
        '10M-50M': { min: 10000000, max: 50000000 },
        '50M-100M': { min: 50000000, max: 100000000 },
        '100M+': { min: 100000000 }
      };
      if (revenueMap[revenueRange]) {
        searchPayload.revenue_range = revenueMap[revenueRange];
      }
    }

    // Add technology filter
    if (technologies && technologies.length > 0) {
      searchPayload.currently_using_any_of_technology_uids = technologies;
    }

    // Add buying intent filters
    if (buyingIntentStrength && buyingIntentStrength !== 'all') {
      searchPayload.intent_strength = [buyingIntentStrength];
    }
    if (buyingIntentTopics && buyingIntentTopics.length > 0) {
      searchPayload.intent_topics = buyingIntentTopics;
    }

    // Payload logging disabled; on error we log a short summary below.

    const apolloResponse = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey,
      },
      body: JSON.stringify(searchPayload)
    });

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error('Apollo API error:', apolloResponse.status, errorText);
      throw new Error(`Apollo API error: ${apolloResponse.status}`);
    }

    const apolloData = await apolloResponse.json();
    console.log(`Apollo returned ${apolloData.organizations?.length || 0} companies`);

    if (!apolloData.organizations || apolloData.organizations.length === 0) {
      return new Response(
        JSON.stringify({ companies: [], totalResults: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform Apollo data to our format
    const companies = apolloData.organizations.map((org: any) => {
      // Map employee count to range
      let employeeRange = null;
      if (org.estimated_num_employees) {
        const count = org.estimated_num_employees;
        if (count < 10) employeeRange = '1-9';
        else if (count < 50) employeeRange = '10-49';
        else if (count < 100) employeeRange = '50-99';
        else if (count < 500) employeeRange = '100-499';
        else employeeRange = '500+';
      }

      // Map revenue to range
      let revenueRange = null;
      if (org.estimated_annual_revenue) {
        const revenue = org.estimated_annual_revenue;
        if (revenue < 1000000) revenueRange = '<$1M';
        else if (revenue < 10000000) revenueRange = '$1M-$10M';
        else if (revenue < 50000000) revenueRange = '$10M-$50M';
        else if (revenue < 100000000) revenueRange = '$50M-$100M';
        else revenueRange = '$100M+';
      }

      // Map years in business to range
      let yearsRange = null;
      if (org.founded_year) {
        const years = new Date().getFullYear() - org.founded_year;
        if (years < 5) yearsRange = '0-4';
        else if (years < 10) yearsRange = '5-9';
        else if (years < 20) yearsRange = '10-19';
        else if (years < 30) yearsRange = '20-29';
        else yearsRange = '30+';
      }

      return {
        apolloId: org.id,
        companyName: org.name,
        websiteUrl: org.website_url || null,
        linkedinUrl: org.linkedin_url || null,
        industry: org.industry || null,
        keywords: org.keywords || [],
        phone: org.phone || null,
        city: org.city || null,
        state: org.state || null,
        country: org.country || null,
        employees: org.estimated_num_employees || null,
        employeeRange,
        revenue: org.estimated_annual_revenue || null,
        revenueRange,
        foundedYear: org.founded_year || null,
        yearsRange,
        description: org.short_description || null,
        logoUrl: org.logo_url || null,
        technologies: org.technologies || [],
        buyingIntentStrength: org.intent_strength || 'none',
        buyingIntentTopics: org.intent_topics || [],
        socialMediaUrls: {
          facebook: org.facebook_url || null,
          twitter: org.twitter_url || null,
          linkedin: org.linkedin_url || null
        }
      };
    });

    return new Response(
      JSON.stringify({ 
        companies,
        totalResults: apolloData.pagination?.total_entries || companies.length,
        page: apolloData.pagination?.page || 1,
        totalPages: apolloData.pagination?.total_pages || 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log detailed error server-side only
    console.error('Error in apollo-company-search:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ error: 'Company search failed. Please try again or contact support.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});