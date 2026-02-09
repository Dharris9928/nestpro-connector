import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
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
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    if (!apolloApiKey) {
      throw new Error('Apollo API key not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const rateLimitResponse = await checkRateLimit(supabase, user.id, 'search-contacts-by-name');
    if (rateLimitResponse) return rateLimitResponse;

    const { personName, email, phone, linkedinUrl, searchType } = await req.json();

    // Build Apollo search body based on search type
    const searchBody: Record<string, any> = {
      api_key: apolloApiKey,
      page: 1,
      per_page: 15,
    };

    if (searchType === 'email' && email) {
      // Search by email
      searchBody.q_keywords = email.trim();
      console.log(`Searching Apollo by email: ${email}`);
    } else if (searchType === 'phone' && phone) {
      // Search by phone
      searchBody.q_keywords = phone.trim();
      console.log(`Searching Apollo by phone: ${phone}`);
    } else if (searchType === 'linkedin' && linkedinUrl) {
      // Search by LinkedIn URL - extract name from URL or use as keyword
      const linkedinClean = linkedinUrl.trim().replace(/\/$/, '');
      const linkedinSlug = linkedinClean.split('/').pop() || '';
      // Convert slug like "john-doe-12345" to search terms
      const nameFromLinkedin = linkedinSlug.replace(/-\d+$/, '').replace(/-/g, ' ');
      searchBody.q_keywords = nameFromLinkedin;
      console.log(`Searching Apollo by LinkedIn: ${linkedinUrl} -> keywords: ${nameFromLinkedin}`);
    } else if (personName && personName.trim().length >= 2) {
      // Default: search by name
      searchBody.q_keywords = personName.trim();
      console.log(`Searching Apollo by name: ${personName}`);
    } else {
      return new Response(
        JSON.stringify({ error: 'Please provide a search term (name, email, phone, or LinkedIn URL)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apolloResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey,
      },
      body: JSON.stringify(searchBody),
    });

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error('Apollo API error:', errorText);
      throw new Error(`Apollo API error: ${apolloResponse.status}`);
    }

    const apolloData = await apolloResponse.json();
    console.log(`Found ${apolloData.people?.length || 0} people`);

    // Pull ALL available data from Apollo
    const contacts = apolloData.people?.map((person: any) => ({
      firstName: person.first_name || '',
      lastName: person.last_name || '',
      title: person.title || null,
      email: person.email || null,
      phone: person.phone_numbers?.[0]?.raw_number || null,
      mobile: person.phone_numbers?.[1]?.raw_number || null,
      linkedinUrl: person.linkedin_url || null,
      organizationName: person.organization?.name || null,
      organizationDomain: person.organization?.primary_domain || null,
      organizationWebsite: person.organization?.website_url || null,
      organizationLinkedin: person.organization?.linkedin_url || null,
      organizationIndustry: person.organization?.industry || null,
      organizationEmployees: person.organization?.estimated_num_employees || null,
      organizationRevenue: person.organization?.annual_revenue_printed || null,
      organizationCity: person.organization?.city || null,
      organizationState: person.organization?.state || null,
      photoUrl: person.photo_url || null,
      city: person.city || null,
      state: person.state || null,
      country: person.country || null,
      headline: person.headline || null,
      seniority: person.seniority || null,
      departments: person.departments || [],
      apolloId: person.id,
      source: 'apollo',
    })) || [];

    return new Response(
      JSON.stringify({ success: true, contacts, totalResults: apolloData.pagination?.total_entries || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Search contacts by name error:', error);
    return new Response(
      JSON.stringify({ error: 'Contact search failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
