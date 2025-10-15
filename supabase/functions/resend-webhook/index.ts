import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

interface ResendWebhookEvent {
  type: 'email.delivered' | 'email.opened' | 'email.bounced' | 'email.complained' | 'email.sent'
  created_at: string
  data: {
    email_id: string
    to: string
    from: string
    subject: string
    created_at: string
    tags?: Record<string, string>
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const payload: ResendWebhookEvent = await req.json()
    
    console.log('Resend webhook received:', {
      type: payload.type,
      email: payload.data.to,
      timestamp: payload.created_at
    })

    // Extract user_id from tags if available
    const userId = payload.data.tags?.user_id
    
    if (!userId) {
      console.log('No user_id in webhook payload, skipping')
      return new Response(
        JSON.stringify({ received: true, message: 'No user_id found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update profile based on event type
    const updates: Record<string, any> = {}
    
    switch (payload.type) {
      case 'email.sent':
        updates.invitation_email_sent_at = payload.created_at
        updates.invitation_email_status = 'sent'
        console.log(`Email sent to user ${userId}`)
        break
        
      case 'email.delivered':
        updates.invitation_email_delivered_at = payload.created_at
        updates.invitation_email_status = 'delivered'
        console.log(`Email delivered to user ${userId}`)
        break
        
      case 'email.opened':
        updates.invitation_email_opened_at = payload.created_at
        updates.invitation_email_status = 'opened'
        console.log(`Email opened by user ${userId}`)
        break
        
      case 'email.bounced':
        updates.invitation_email_status = 'bounced'
        console.log(`Email bounced for user ${userId}`)
        break
        
      case 'email.complained':
        updates.invitation_email_status = 'complained'
        console.log(`Email complained for user ${userId}`)
        break
        
      default:
        console.log(`Unhandled event type: ${payload.type}`)
    }

    // Update profile if we have updates
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        throw updateError
      }

      console.log(`Updated profile ${userId} with:`, updates)
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (err) {
    console.error('Resend webhook error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
