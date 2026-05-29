import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // User-scoped client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin client (service role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Basic rate limit
    const rl = await checkRateLimit(supabaseAdmin, user.id, 'admin-list-profiles')
    if (rl) return rl

    // Ensure elevated access
    const { data: allowed, error: accessError } = await supabaseClient
      .rpc('has_elevated_access', { _user_id: user.id })

    if (accessError || !allowed) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch profiles (service role bypasses RLS but access already checked)
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, approval_status, created_at, invitation_email_sent_at, invitation_email_delivered_at, invitation_email_opened_at, invitation_email_status, approved_at, approved_by')

    if (error) throw error

    return new Response(
      JSON.stringify({ profiles }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('admin-list-profiles error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})