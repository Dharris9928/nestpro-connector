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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Supabase client with the user's token for authorization
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit and create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    const rateLimitResponse = await checkRateLimit(supabaseAdmin, user.id, 'get-user-emails');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check if user has elevated access using secure RPC function
    const { data: hasAccess, error: accessError } = await supabaseClient
      .rpc('has_elevated_access', { _user_id: user.id })

    if (accessError || !hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Admin or Sales Manager role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userIds } = await req.json()

    if (!userIds || !Array.isArray(userIds)) {
      throw new Error('userIds must be an array')
    }

    // Fetch user data from auth.users using admin client
    const emails: Record<string, string> = {}
    const loginStatus: Record<string, string | null> = {}
    
    for (const userId of userIds) {
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (!error && user) {
        if (user.email) {
          emails[userId] = user.email
        }
        // Store last sign in time to determine if user has actually logged in
        loginStatus[userId] = user.last_sign_in_at || null
      }
    }

    return new Response(
      JSON.stringify({ emails, loginStatus }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error fetching user emails:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})