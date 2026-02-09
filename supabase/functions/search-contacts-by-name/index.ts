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

    const { personName } = await req.json();
    if (!personName || personName.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Person name must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching Apollo for person: ${personName}`);

    const apolloResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apolloApiKey,
      },
      body: JSON.stringify({
        api_key: apolloApiKey,
        q_keywords: personName.trim(),
        page: 1,
        per_page: 15,
      }),
    });

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error('Apollo API error:', errorText);
      throw new Error(`Apollo API error: ${apolloResponse.status}`);
    }

    const apolloData = await apolloResponse.json();
    console.log(`Found ${apolloData.people?.length || 0} people`);

    const contacts = apolloData.people?.map((person: any) => ({
      firstName: person.first_name,
      lastName: person.last_name,
      title: person.title,
      email: person.email,
      phone: person.phone_numbers?.[0]?.raw_number || null,
      linkedinUrl: person.linkedin_url,
      organizationName: person.organization?.name || null,
      organizationDomain: person.organization?.primary_domain || null,
      photoUrl: person.photo_url,
      city: person.city,
      state: person.state,
      country: person.country,
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
