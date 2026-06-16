import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { checkRateLimit } from '../_shared/rateLimiting.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  action: z.enum(['list', 'fetch']),
  labelId: z.string().min(1).max(100).optional(),
  perPage: z.number().min(1).max(100).optional(),
  maxRecords: z.number().min(1).max(1000).optional(),
  labelType: z.enum(['contact', 'account']).optional(),
});

function normalizeLabelType(modality: unknown): 'contact' | 'account' {
  const value = String(modality || '').toLowerCase();
  return value === 'account' || value === 'accounts' ? 'account' : 'contact';
}

// Map an Apollo person object to the same shape produced by an Apollo CSV row
// so the existing groupByCompany/importApolloData pipeline can consume it.
function mapPersonToCsvRow(person: any) {
  const org = person.organization || person.account || {};
  const orgCity = org.city || person.city || null;
  const orgState = org.state || person.state || null;
  const orgCountry = org.country || person.country || null;

  return {
    'First Name': person.first_name || '',
    'Last Name': person.last_name || '',
    'Title': person.title || '',
    'Email': person.email || '',
    'Person Linkedin Url': person.linkedin_url || '',
    'Mobile Phone': person.mobile_phone || person.phone || '',
    'Seniority': person.seniority || '',

    'Company': org.name || '',
    'Company Name': org.name || '',
    'Organization Name': org.name || '',
    'Website': org.website_url || '',
    'Company Website': org.website_url || '',
    'Industry': org.industry || '',
    'Company Linkedin Url': org.linkedin_url || '',
    '# Employees': org.estimated_num_employees || '',
    'Annual Revenue': org.annual_revenue || org.organization_revenue || '',
    'City': orgCity,
    'State': orgState,
    'Country': orgCountry,
    'Company Phone': org.phone || org.sanitized_phone || '',
    'Facebook Url': org.facebook_url || '',
    'Twitter Url': org.twitter_url || '',
    'Keywords': Array.isArray(org.keywords) ? org.keywords.join(', ') : '',
  };
}

function mapCompanyToCsvRow(company: any) {
  const primaryPhone = company.primary_phone?.sanitized_number || company.primary_phone?.number || '';

  return {
    'First Name': '',
    'Last Name': '',
    'Title': '',
    'Email': '',
    'Person Linkedin Url': '',
    'Mobile Phone': '',
    'Seniority': '',

    'Company': company.name || '',
    'Company Name': company.name || '',
    'Organization Name': company.name || '',
    'Website': company.website_url || company.domain || '',
    'Company Website': company.website_url || company.domain || '',
    'Industry': company.industry || '',
    'Company Linkedin Url': company.linkedin_url || '',
    '# Employees': company.estimated_num_employees || '',
    'Annual Revenue': company.annual_revenue || company.organization_revenue || '',
    'City': company.city || '',
    'State': company.state || '',
    'Country': company.country || '',
    'Company Phone': company.phone || company.sanitized_phone || primaryPhone,
    'Facebook Url': company.facebook_url || '',
    'Twitter Url': company.twitter_url || '',
    'Keywords': Array.isArray(company.keywords) ? company.keywords.join(', ') : '',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apolloApiKey = Deno.env.get('APOLLO_API_KEY');
    if (!apolloApiKey) throw new Error('Apollo API key not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const rateLimitResponse = await checkRateLimit(supabase, user.id, 'apollo-saved-lists');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, labelId, perPage = 100, maxRecords = 500 } = validation.data;

    // ============================================================
    // LIST: return Apollo saved lists (labels)
    // ============================================================
    if (action === 'list') {
      const resp = await fetch('https://api.apollo.io/v1/labels', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey,
        },
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('Apollo labels error:', resp.status, text);
        return new Response(
          JSON.stringify({ error: `Apollo API error: ${resp.status}`, details: text }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await resp.json();
      // Apollo returns either an array or { labels: [...] }
      const labels = Array.isArray(data) ? data : (data.labels || []);

      const cleaned = labels.map((l: any) => ({
        id: l.id,
        name: l.name,
        team_id: l.team_id || null,
        created_at: l.created_at || null,
        modified_at: l.modified_at || null,
        cached_count: l.cached_count ?? l.num_contacts ?? null,
        modality: normalizeLabelType(l.modality || l.label_type),
      }));

      return new Response(
        JSON.stringify({ labels: cleaned }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // FETCH: pull people or companies from a specific saved list (label)
    // ============================================================
    if (action === 'fetch') {
      if (!labelId) {
        return new Response(
          JSON.stringify({ error: 'labelId required for fetch action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isAccount = validation.data.labelType === 'account';
      const rows: any[] = [];
      let page = 1;
      let total = 0;

      while (rows.length < maxRecords) {
        const endpoint = isAccount
          ? 'https://api.apollo.io/api/v1/accounts/search'
          : 'https://api.apollo.io/api/v1/contacts/search';
        const labelFilter = isAccount
          ? { account_label_ids: [labelId] }
          : { contact_label_ids: [labelId] };

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json',
            'X-Api-Key': apolloApiKey,
          },
          body: JSON.stringify({
            ...labelFilter,
            page,
            per_page: perPage,
          }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error('Apollo search error:', resp.status, text);
          return new Response(
            JSON.stringify({ error: `Apollo API error: ${resp.status}`, details: text }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await resp.json();

        if (isAccount) {
          const companies: any[] = data.accounts || [];
          total = data.pagination?.total_entries ?? total;
          if (companies.length === 0) break;
          for (const c of companies) {
            rows.push(mapCompanyToCsvRow(c));
            if (rows.length >= maxRecords) break;
          }
        } else {
          const people: any[] = data.contacts || [];
          total = data.pagination?.total_entries ?? total;
          if (people.length === 0) break;
          for (const p of people) {
            rows.push(mapPersonToCsvRow(p));
            if (rows.length >= maxRecords) break;
          }
        }

        const totalPages = data.pagination?.total_pages ?? 1;
        if (page >= totalPages) break;
        page++;
      }

      return new Response(
        JSON.stringify({ rows, totalAvailable: total, fetched: rows.length, labelType: body.labelType || 'contact' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('apollo-saved-lists error:', e);
    return new Response(
      JSON.stringify({ error: e.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
