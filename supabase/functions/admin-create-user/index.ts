import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/authorization.ts";

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: 'admin' | 'sales_manager' | 'sales_rep' | 'read_only';
  useTemporaryPassword: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const { supabase } = await requireAdmin(req);

    const requestData: CreateUserRequest = await req.json();
    const { email, firstName, lastName, password, role, useTemporaryPassword } = requestData;

    // Validate required fields
    if (!email || !firstName || !lastName || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate temporary password if needed
    const actualPassword = useTemporaryPassword 
      ? `Temp${Math.random().toString(36).slice(2, 10)}!`
      : password;

    if (!actualPassword) {
      return new Response(
        JSON.stringify({ error: "Password is required when not using temporary password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user via admin API using service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: actualPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        requires_password_change: useTemporaryPassword
      }
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "User creation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wait a bit for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update profile with temp password and email tracking
    // (profile is created by handle_new_user trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        temp_password: useTemporaryPassword ? actualPassword : null,
        invitation_email_sent_at: useTemporaryPassword ? new Date().toISOString() : null,
        invitation_email_status: useTemporaryPassword ? 'sent' : 'not_applicable'
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Try to clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to update profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role (upsert to handle default role created by trigger)
    const { error: roleUpsertError } = await supabase
      .from('user_roles')
      .upsert(
        { user_id: authData.user.id, role },
        { onConflict: 'user_id' }
      );

    if (roleUpsertError) {
      console.error("Role upsert error:", roleUpsertError);
      // Try to clean up the auth user if role assignment fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to assign role: ${roleUpsertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        temporaryPassword: useTemporaryPassword ? actualPassword : null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin-create-user:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
