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

    const { personName, email, phone, linkedinUrl, apolloUrl, searchType } = await req.json();

    // Handle Apollo profile URL - direct person lookup
    if (searchType === 'apollo' && apolloUrl) {
      const apolloIdMatch = apolloUrl.match(/(?:people|contacts|#\/contacts)\/([a-zA-Z0-9_-]+)/i);
      if (!apolloIdMatch) {
        return new Response(
          JSON.stringify({ error: 'Invalid Apollo profile URL. Expected format: app.apollo.io/#/contacts/... or app.apollo.io/people/...' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const apolloPersonId = apolloIdMatch[1];
      console.log(`Looking up Apollo person by ID: ${apolloPersonId}`);

      const personResponse = await fetch(`https://api.apollo.io/v1/people/${apolloPersonId}?api_key=${apolloApiKey}`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache', 'X-Api-Key': apolloApiKey },
      });

      if (!personResponse.ok) {
        const errorText = await personResponse.text();
        console.error('Apollo person lookup error:', errorText);
        throw new Error(`Apollo API error: ${personResponse.status}`);
      }

      const personData = await personResponse.json();
      const person = personData.person || personData;
      console.log(`Apollo person lookup result: ${person.first_name} ${person.last_name}, email: ${person.email}`);

      const contact = {
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
      };

      return new Response(
        JSON.stringify({ success: true, contacts: [contact], totalResults: 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Build Apollo search body based on search type
    const searchBody: Record<string, any> = {
      api_key: apolloApiKey,
      page: 1,
      per_page: 15,
    };

    if (searchType === 'email' && email) {
      searchBody.q_keywords = email.trim();
      console.log(`Searching Apollo by email: ${email}`);
    } else if (searchType === 'phone' && phone) {
      searchBody.q_keywords = phone.trim();
      console.log(`Searching Apollo by phone: ${phone}`);
    } else if (searchType === 'linkedin' && linkedinUrl) {
      const linkedinClean = linkedinUrl.trim().replace(/\/$/, '');
      const linkedinSlug = linkedinClean.split('/').pop() || '';
      const nameFromLinkedin = linkedinSlug.replace(/-\d+$/, '').replace(/-/g, ' ');
      searchBody.q_keywords = nameFromLinkedin;
      console.log(`Searching Apollo by LinkedIn: ${linkedinUrl} -> keywords: ${nameFromLinkedin}`);
    } else if (personName && personName.trim().length >= 2) {
      // Use q_person_name for better structured name matching
      searchBody.q_person_name = personName.trim();
      console.log(`Searching Apollo by name (q_person_name): ${personName}`);
    } else {
      return new Response(
        JSON.stringify({ error: 'Please provide a search term (name, email, phone, LinkedIn URL, or Apollo link)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apolloResponse = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
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
    if (apolloData.people?.[0]) {
      const p = apolloData.people[0];
      console.log(`First result: ${p.first_name} ${p.last_name}, email: ${p.email}, phone: ${JSON.stringify(p.phone_numbers)}`);
    }

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
