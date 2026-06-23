import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ATTEMPTS_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MINUTES = 1;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token format before database query
    if (!UUID_REGEX.test(token)) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check rate limit
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_presentation_token_rate_limit', {
        _ip_address: ipAddress,
        _max_attempts: MAX_ATTEMPTS_PER_MINUTE,
        _window_minutes: RATE_LIMIT_WINDOW_MINUTES
      });

    if (rateLimitError) {
      console.error('[Token Validation] Rate limit check error:', rateLimitError);
    }

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      console.warn(`[Token Validation] Rate limit exceeded for IP: ${ipAddress}`);
      return new Response(
        JSON.stringify({ 
          error: 'Too many attempts. Please try again later.',
          valid: false,
          retryAfter: rateLimitCheck.retry_after || 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitCheck.retry_after || 60)
          } 
        }
      );
    }

    // Validate token using security definer function
    const { data: presentation, error } = await supabase
      .rpc('validate_presentation_token', { token_text: token });

    const isSuccess = !error && !!presentation;

    // Log this validation attempt
    await supabase.rpc('log_token_validation_attempt', {
      _ip_address: ipAddress,
      _token_attempted: token.substring(0, 8) + '...', // Only log partial token
      _success: isSuccess,
      _user_agent: userAgent
    });

    if (!isSuccess) {
      // Check for brute force and create alert if needed
      await supabase.rpc('check_and_alert_brute_force', {
        _ip_address: ipAddress
      });

      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired token',
          valid: false 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful access
    await supabase.rpc('log_presentation_access', {
      _presentation_id: presentation.id,
      _ip_address: ipAddress,
      _user_agent: userAgent
    });

    return new Response(
      JSON.stringify({ 
        valid: true,
        presentation 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Token Validation] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Validation failed. Please try again.',
        valid: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});