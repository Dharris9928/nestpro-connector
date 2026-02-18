import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user and check rate limit
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!authError && user) {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(supabase, user.id, 'apollo-enrich');
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
    }

    const { companyName, websiteUrl, linkedinUrl } = await req.json();

    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'companyName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
    if (!APOLLO_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'APOLLO_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for organization using Apollo API
    console.log(`Searching Apollo for: ${companyName}`);
    
    const searchPayload: any = {
      q_organization_name: companyName,
      page: 1,
      per_page: 1
    };

    if (websiteUrl) {
      searchPayload.q_organization_domains = [websiteUrl.replace(/^https?:\/\//, '').split('/')[0]];
    }

    const searchResponse = await fetch('https://api.apollo.io/v1/organizations/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY,
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(searchPayload)
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Apollo API error:', searchResponse.status, errorText);
      throw new Error(`Apollo API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.organizations || searchData.organizations.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Company not found in Apollo database',
          found: false 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const org = searchData.organizations[0];
    console.log('Found organization:', org.name);

    // Map Apollo data to our schema
    const enrichmentData: any = {
      found: true,
      apolloData: {
        name: org.name,
        website: org.website_url,
        linkedinUrl: org.linkedin_url,
        employees: org.estimated_num_employees,
        revenue: org.annual_revenue,
        industry: org.industry,
        keywords: org.keywords,
        city: org.city,
        state: org.state,
        country: org.country,
        foundedYear: org.founded_year,
        buyingIntentSignals: org.intent_signals || [],
        buyingIntentStrength: org.intent_strength || 'none',
        buyingIntentTopics: org.intent_topics || [],
        technologies: org.currently_using_any_of_technology_names || [],
        parentOrganization: org.parent_organization || null
      }
    };

    // Map to our company fields
    const companyUpdates: any = {};

    // Employee count mapping
    if (org.estimated_num_employees) {
      companyUpdates.total_employees = org.estimated_num_employees;
      
      // Map to range
      if (org.estimated_num_employees <= 5) companyUpdates.total_employees_range = '1-5';
      else if (org.estimated_num_employees <= 10) companyUpdates.total_employees_range = '6-10';
      else if (org.estimated_num_employees <= 25) companyUpdates.total_employees_range = '11-25';
      else if (org.estimated_num_employees <= 50) companyUpdates.total_employees_range = '26-50';
      else if (org.estimated_num_employees <= 100) companyUpdates.total_employees_range = '51-100';
      else if (org.estimated_num_employees <= 250) companyUpdates.total_employees_range = '101-250';
      else if (org.estimated_num_employees <= 500) companyUpdates.total_employees_range = '251-500';
      else companyUpdates.total_employees_range = '500+';
    }

    // Revenue mapping
    if (org.annual_revenue) {
      const revenue = org.annual_revenue;
      if (revenue < 500000) companyUpdates.annual_revenue_range = '<$500K';
      else if (revenue < 1000000) companyUpdates.annual_revenue_range = '$500K-$999K';
      else if (revenue < 3000000) companyUpdates.annual_revenue_range = '$1M-$2.9M';
      else if (revenue < 6000000) companyUpdates.annual_revenue_range = '$3M-$5.9M';
      else if (revenue < 10000000) companyUpdates.annual_revenue_range = '$6M-$10M';
      else companyUpdates.annual_revenue_range = '$10M+';
    }

    // Years in business
    if (org.founded_year) {
      const currentYear = new Date().getFullYear();
      companyUpdates.years_in_business = currentYear - org.founded_year;
      
      const yearsInBiz = companyUpdates.years_in_business;
      if (yearsInBiz < 5) companyUpdates.years_in_business_range = '<5';
      else if (yearsInBiz <= 10) companyUpdates.years_in_business_range = '5-10';
      else if (yearsInBiz <= 20) companyUpdates.years_in_business_range = '11-20';
      else if (yearsInBiz <= 30) companyUpdates.years_in_business_range = '21-30';
      else companyUpdates.years_in_business_range = '30+';
    }

    // LinkedIn URL
    if (org.linkedin_url && !linkedinUrl) {
      companyUpdates.linkedin_company_url = org.linkedin_url;
    }

    // Website URL
    if (org.website_url && !websiteUrl) {
      companyUpdates.website_url = org.website_url;
    }

    // Location data
    if (org.city) companyUpdates.city = org.city;
    if (org.state) companyUpdates.state = org.state;
    if (org.street_address) companyUpdates.address_line1 = org.street_address;
    if (org.postal_code) companyUpdates.zip = org.postal_code;
    if (org.phone) companyUpdates.primary_phone = org.phone;
    if (org.primary_phone?.number) companyUpdates.primary_phone = org.primary_phone.number;

    // Industry type and specialty detection based on keywords and industry
    const keywords = (org.keywords || []).map((k: string) => k.toLowerCase()).join(' ');
    const industry = (org.industry || '').toLowerCase();
    const combined = `${keywords} ${industry}`;
    
    // Detect if it's a Builder or Contractor
    const isBuilder = /builder|construction|homebuilder|developer|residential construction/i.test(combined);
    const isContractor = /hvac|plumb|electric|contractor|mechanical|heating|cooling|air condition/i.test(combined);
    
    if (isBuilder) {
      companyUpdates.industry_type = 'Builder';
    } else if (isContractor) {
      companyUpdates.industry_type = 'Contractor';
      
      // Detect contractor specialty
      if (/hvac|heating|cooling|air condition/i.test(combined)) {
        companyUpdates.contractor_specialty = 'HVAC';
      } else if (/plumb/i.test(combined)) {
        companyUpdates.contractor_specialty = 'Plumbing';
      } else if (/electric/i.test(combined)) {
        companyUpdates.contractor_specialty = 'Electrical';
      }
    }

    // Buying intent data
    if (org.intent_strength && org.intent_strength !== 'none') {
      companyUpdates.buying_intent_strength = org.intent_strength;
      companyUpdates.buying_intent_last_detected = new Date().toISOString();
    }
    if (org.intent_topics && org.intent_topics.length > 0) {
      companyUpdates.buying_intent_topics = org.intent_topics;
    }
    if (org.currently_using_any_of_technology_names && org.currently_using_any_of_technology_names.length > 0) {
      companyUpdates.currently_using_technologies = org.currently_using_any_of_technology_names;
    }

    // Handle parent organization/subsidiary relationship
    let parentCompanyCreated = false;
    let parentCompanyName = null;
    
    if (org.parent_organization && org.parent_organization.name) {
      console.log('Parent organization detected:', org.parent_organization.name);
      parentCompanyName = org.parent_organization.name;
      
      // Check if parent company already exists in our database
      const { data: existingParent, error: searchError } = await supabase
        .from('companies')
        .select('id, company_name')
        .ilike('company_name', org.parent_organization.name)
        .limit(1)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error searching for parent company:', searchError);
      }

      if (existingParent) {
        // Parent company already exists, just link to it
        console.log('Parent company exists, linking:', existingParent.id);
        companyUpdates.parent_company_id = existingParent.id;
        companyUpdates.company_type = 'subsidiary';
      } else {
        // Create the parent company
        console.log('Creating new parent company:', org.parent_organization.name);
        
        // Get the current user for created_by field
        let createdBy = null;
        if (authHeader) {
          const { data: { user } } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
          );
          if (user) {
            createdBy = user.id;
          }
        }
        
        const newParentData: any = {
          company_name: org.parent_organization.name,
          company_type: 'parent',
          is_parent_company: true,
          industry_type: companyUpdates.industry_type || 'Contractor',
          created_by: createdBy
        };

        // Add optional parent org data if available
        if (org.parent_organization.website_url) {
          newParentData.website_url = org.parent_organization.website_url;
        }
        if (org.parent_organization.linkedin_url) {
          newParentData.linkedin_company_url = org.parent_organization.linkedin_url;
        }

        const { data: newParent, error: createError } = await supabase
          .from('companies')
          .insert(newParentData)
          .select('id, company_name')
          .single();

        if (createError) {
          console.error('Error creating parent company:', createError);
        } else if (newParent) {
          console.log('Parent company created successfully:', newParent.id);
          companyUpdates.parent_company_id = newParent.id;
          companyUpdates.company_type = 'subsidiary';
          parentCompanyCreated = true;
          
          // Create notification for user
          if (createdBy) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: createdBy,
                type: 'parent_company_created',
                title: 'Parent Company Created',
                message: `A new parent company "${newParent.company_name}" was created and linked during Apollo enrichment. Please review and update the company profile.`,
                link_url: `/companies?search=${encodeURIComponent(newParent.company_name)}`,
                is_read: false
              });

            if (notifError) {
              console.error('Error creating notification:', notifError);
            }
          }
        }
      }
    }

    enrichmentData.companyUpdates = companyUpdates;
    enrichmentData.fieldsEnriched = Object.keys(companyUpdates);
    enrichmentData.parentCompanyCreated = parentCompanyCreated;
    enrichmentData.parentCompanyName = parentCompanyName;

    return new Response(
      JSON.stringify(enrichmentData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Apollo enrichment error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, found: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
