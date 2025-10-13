import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Starting data export for user: ${user.id}`);

    // Create export request record
    const { data: exportRequest, error: requestError } = await supabaseClient
      .from('data_export_requests')
      .insert({
        user_id: user.id,
        status: 'processing',
        request_type: 'full',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // Collect all user data
    const userData: any = {
      user_profile: null,
      companies: [],
      contacts: [],
      company_communications: [],
      activities: [],
      opportunities: [],
      consents: [],
      audit_logs: [],
      metadata: {
        export_date: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
      },
    };

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    userData.user_profile = profile;

    // Get companies created by user
    const { data: companies } = await supabaseClient
      .from('companies')
      .select('*')
      .eq('created_by', user.id);
    userData.companies = companies || [];

    // Get contacts for user's companies
    if (companies && companies.length > 0) {
      const companyIds = companies.map((c: any) => c.id);
      const { data: contacts } = await supabaseClient
        .from('contacts')
        .select('*')
        .in('company_id', companyIds);
      userData.contacts = contacts || [];

      // Get communications for user's companies
      const { data: communications } = await supabaseClient
        .from('company_communications')
        .select('*')
        .in('company_id', companyIds);
      userData.company_communications = communications || [];

      // Get activities
      const { data: activities } = await supabaseClient
        .from('activities')
        .select('*')
        .in('company_id', companyIds);
      userData.activities = activities || [];

      // Get opportunities
      const { data: opportunities } = await supabaseClient
        .from('opportunities')
        .select('*')
        .in('company_id', companyIds);
      userData.opportunities = opportunities || [];
    }

    // Get user consents
    const { data: consents } = await supabaseClient
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id);
    userData.consents = consents || [];

    // Get audit logs for user
    const { data: auditLogs } = await supabaseClient
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .limit(1000); // Limit to last 1000 audit entries
    userData.audit_logs = auditLogs || [];

    // Calculate record counts
    const recordCount = {
      companies: userData.companies.length,
      contacts: userData.contacts.length,
      communications: userData.company_communications.length,
      activities: userData.activities.length,
      opportunities: userData.opportunities.length,
      consents: userData.consents.length,
      audit_logs: userData.audit_logs.length,
    };

    // Convert to JSON
    const jsonData = JSON.stringify(userData, null, 2);
    const fileSize = new Blob([jsonData]).size;

    console.log(`Export completed. Size: ${fileSize} bytes, Records: ${JSON.stringify(recordCount)}`);

    // Update export request with completion
    await supabaseClient
      .from('data_export_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        file_size_bytes: fileSize,
        record_count: recordCount,
      })
      .eq('id', exportRequest.id);

    // Return the data directly
    return new Response(jsonData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-data-export-${user.id}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
