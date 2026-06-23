import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApolloOrganization {
  name?: string;
  primary_domain?: string;
  domain?: string;
  website_url?: string;
  linkedin_url?: string;
  industry?: string;
  estimated_num_employees?: number;
  annual_revenue_printed?: string;
  city?: string;
  state?: string;
}

interface ApolloPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  phone_numbers?: Array<{ raw_number?: string }>;
  sanitized_phone?: string;
  linkedin_url?: string;
  organization?: ApolloOrganization;
  account?: ApolloOrganization;
  organization_name?: string;
  photo_url?: string;
  city?: string;
  state?: string;
  country?: string;
  headline?: string;
  seniority?: string;
  departments?: string[];
}

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
      // Extract ID and determine if it's a contacts or people URL
      const contactsMatch = apolloUrl.match(/(?:#\/contacts|\/contacts)\/([a-zA-Z0-9_-]+)/i);
      const peopleMatch = apolloUrl.match(/\/people\/([a-zA-Z0-9_-]+)/i);
      const extractedId = contactsMatch?.[1] || peopleMatch?.[1];
      const isContactId = !!contactsMatch;

      if (!extractedId) {
        return new Response(
          JSON.stringify({ error: 'Invalid Apollo profile URL. Expected format: app.apollo.io/#/contacts/... or app.apollo.io/people/...' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Looking up Apollo ${isContactId ? 'contact' : 'person'} by ID: ${extractedId}`);

      // Try the appropriate endpoint first, then fall back to the other
      let person: ApolloPerson | null = null;

      const tryEndpoint = async (endpoint: string, id: string) => {
        const resp = await fetch(`https://api.apollo.io/v1/${endpoint}/${id}?api_key=${apolloApiKey}`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache', 'X-Api-Key': apolloApiKey },
        });
        if (!resp.ok) {
          const errorText = await resp.text();
          console.log(`Apollo ${endpoint} lookup returned ${resp.status}: ${errorText}`);
          return null;
        }
        const data = await resp.json();
        return data.person || data.contact || data;
      };

      // Try primary endpoint based on URL type
      if (isContactId) {
        person = await tryEndpoint('contacts', extractedId);
        if (!person) person = await tryEndpoint('people', extractedId);
      } else {
        person = await tryEndpoint('people', extractedId);
        if (!person) person = await tryEndpoint('contacts', extractedId);
      }

      if (!person || (!person.first_name && !person.last_name)) {
        // Last resort: search by the ID as a keyword
        console.log('Direct lookup failed, trying search by Apollo URL');
        const searchResp = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': apolloApiKey },
          body: JSON.stringify({ api_key: apolloApiKey, page: 1, per_page: 1, q_keywords: extractedId }),
        });
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          if (searchData.people?.[0]) person = searchData.people[0];
        } else {
          await searchResp.text(); // consume body
        }
      }

      if (!person || (!person.first_name && !person.last_name)) {
        return new Response(
          JSON.stringify({ error: 'Contact not found in Apollo. The profile may no longer exist.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Apollo person lookup result: ${person.first_name} ${person.last_name}, email: ${person.email}, org: ${person.organization?.name || person.account?.name || person.organization_name || 'none'}`);

      // Apollo contacts endpoint uses "account" while people endpoint uses "organization"
      const org = person.organization || person.account || {};

      const contact = {
        firstName: person.first_name || '',
        lastName: person.last_name || '',
        title: person.title || null,
        email: person.email || null,
        phone: person.phone_numbers?.[0]?.raw_number || person.sanitized_phone || null,
        mobile: person.phone_numbers?.[1]?.raw_number || null,
        linkedinUrl: person.linkedin_url || null,
        organizationName: org.name || person.organization_name || null,
        organizationDomain: org.primary_domain || org.domain || null,
        organizationWebsite: org.website_url || null,
        organizationLinkedin: org.linkedin_url || null,
        organizationIndustry: org.industry || null,
        organizationEmployees: org.estimated_num_employees || null,
        organizationRevenue: org.annual_revenue_printed || null,
        organizationCity: org.city || null,
        organizationState: org.state || null,
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
    const searchBody: Record<string, string | number> = {
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
    const contacts = apolloData.people?.map((person: ApolloPerson) => ({
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
