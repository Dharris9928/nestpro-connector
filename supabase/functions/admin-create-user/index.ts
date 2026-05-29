import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/authorization.ts";
import { z } from "https://esm.sh/zod@3.23.8";

function getCorsHeaders(req: Request): Record<string, string> {
  const requestedHeaders = req.headers.get('access-control-request-headers');

  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': requestedHeaders ?? 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Max-Age': '86400',
  };
}

const createUserSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().min(8).max(128).optional()),
  role: z.enum(['admin', 'sales_manager', 'sales_rep', 'read_only']),
  useTemporaryPassword: z.boolean(),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const { supabase } = await requireAdmin(req);

    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validation.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, firstName, lastName, password, role, useTemporaryPassword } = validation.data;

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

    // Get the admin user ID for approval tracking
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const { data: { user: adminUser } } = await supabase.auth.getUser(token);

    // Update profile with email tracking + auto-approve invited users.
    // NOTE: We intentionally do NOT store the temporary password in the DB.
    // The temp password is returned ONCE in the response below so the admin
    // UI can show it immediately, then it is discarded forever.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        invitation_email_sent_at: useTemporaryPassword ? new Date().toISOString() : null,
        invitation_email_status: useTemporaryPassword ? 'sent' : 'not_applicable',
        approval_status: useTemporaryPassword ? 'approved' : 'pending',
        approved_at: useTemporaryPassword ? new Date().toISOString() : null,
        approved_by: useTemporaryPassword ? adminUser?.id : null
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to update profile. Please try again." }),
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
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign role. Please try again." }),
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
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
