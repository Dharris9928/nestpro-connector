import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApolloEmailActivity {
  id: string;
  emailer_campaign_id?: string;
  emailer_campaign_name?: string;
  emailer_step_id?: string;
  emailer_step_position?: number;
  emailer_template_id?: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  contact_id?: string;
  contact?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    title?: string;
    organization_name?: string;
    organization?: {
      id: string;
      name?: string;
      website_url?: string;
    };
  };
  account?: {
    id: string;
    name?: string;
    domain?: string;
  };
  status?: string;
  sent_at?: string;
  created_at?: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  bounced_at?: string;
  email_status?: string;
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

    // Authenticate user
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

    const body = await req.json();
    const { action, page = 1, perPage = 100, dateFrom, dateTo, sequenceId } = body;

    if (action === 'fetch-sequences') {
      // Fetch email sequences/campaigns
      console.log('Fetching Apollo email sequences...');
      
      const url = new URL('https://api.apollo.io/api/v1/emailer_campaigns/search');
      url.searchParams.set('api_key', apolloApiKey);
      url.searchParams.set('page', String(page));
      url.searchParams.set('per_page', String(perPage));
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Apollo sequences API error:', response.status, errorText);
        throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Found ${data.emailer_campaigns?.length || 0} sequences`);

      return new Response(
        JSON.stringify({
          success: true,
          sequences: data.emailer_campaigns || [],
          pagination: data.pagination
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fetch-emails') {
      // Fetch sent emails
      console.log('Fetching Apollo sent emails...');
      
      const url = new URL('https://api.apollo.io/api/v1/emailer_messages/search');
      url.searchParams.set('api_key', apolloApiKey);
      url.searchParams.set('page', String(page));
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('sort_by_field', 'created_at');
      url.searchParams.set('sort_ascending', 'false');

      // Add date filters if provided
      if (dateFrom) {
        url.searchParams.set('emailer_message_created_at_gt', dateFrom);
      }
      if (dateTo) {
        url.searchParams.set('emailer_message_created_at_lt', dateTo);
      }
      if (sequenceId) {
        url.searchParams.append('emailer_campaign_ids[]', sequenceId);
      }

      console.log('Fetching from URL:', url.toString().replace(apolloApiKey, 'REDACTED'));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Apollo emails API error:', response.status, errorText);
        throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const emails: ApolloEmailActivity[] = data.emailer_messages || [];
      
      console.log(`Found ${emails.length} emails`);

      // Transform to our format
      const transformedEmails = emails.map(email => ({
        apolloId: email.id,
        sequenceId: email.emailer_campaign_id,
        sequenceName: email.emailer_campaign_name,
        stepPosition: email.emailer_step_position,
        subject: email.subject,
        bodyText: email.body_text,
        bodyHtml: email.body_html,
        status: email.status || email.email_status,
        sentAt: email.sent_at,
        openedAt: email.opened_at,
        clickedAt: email.clicked_at,
        repliedAt: email.replied_at,
        bouncedAt: email.bounced_at,
        contact: email.contact ? {
          apolloId: email.contact.id,
          firstName: email.contact.first_name,
          lastName: email.contact.last_name,
          email: email.contact.email,
          title: email.contact.title,
          companyName: email.contact.organization_name || email.contact.organization?.name,
          companyDomain: email.contact.organization?.website_url
        } : null,
        company: email.account ? {
          apolloId: email.account.id,
          name: email.account.name,
          domain: email.account.domain
        } : null
      }));

      return new Response(
        JSON.stringify({
          success: true,
          emails: transformedEmails,
          pagination: data.pagination,
          totalCount: data.pagination?.total_entries || emails.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Apollo email import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Import failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
