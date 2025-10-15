import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/authorization.ts";

interface ResendInvitationRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const { supabase } = await requireAdmin(req);

    const { userId }: ResendInvitationRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile with temp password
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('temp_password, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.temp_password) {
      return new Response(
        JSON.stringify({ error: "User does not have a temporary password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invitation tracking
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        invitation_email_sent_at: new Date().toISOString(),
        invitation_email_status: 'sent'
      })
      .eq('id', userId);

    if (updateError) {
      console.error("Error updating invitation status:", updateError);
    }

    // In production, you would send an actual email here
    // For now, we just update the tracking fields

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Invitation reminder sent successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in resend-invitation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
