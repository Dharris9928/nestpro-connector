import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/authorization.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Get user profile (no temp_password — passwords are never stored)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the admin user ID for approval tracking
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const { data: { user: adminUser } } = await supabase.auth.getUser(token);

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.user.email;
    const userName = profile.first_name && profile.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : userEmail;

    // Generate a brand-new temporary password and update the auth user.
    // The plaintext value is emailed once and never persisted to the DB.
    const newTempPassword = `Temp${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}!`;
    const { error: pwError } = await supabase.auth.admin.updateUserById(userId, {
      password: newTempPassword,
      user_metadata: { ...(userData.user.user_metadata || {}), requires_password_change: true },
    });
    if (pwError) {
      console.error("Error resetting password:", pwError);
      return new Response(
        JSON.stringify({ error: "Failed to reset password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invitation tracking and auto-approve if not already approved
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        invitation_email_sent_at: new Date().toISOString(),
        invitation_email_status: 'sent',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser?.id
      })
      .eq('id', userId);

    if (updateError) {
      console.error("Error updating invitation status:", updateError);
    }

    // Send invitation email via Resend
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace('/supabase', '') || 'https://app.nestproconnector.com';
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Nest Pro <info@nestproconnector.com>";
    
    const htmlContent = `
      <h2>Welcome to Nest Pro CRM!</h2>
      <p>Hi ${userName},</p>
      <p>Your account has been approved and you can now access the Nest Pro CRM system.</p>
      <p><strong>Your temporary password is:</strong></p>
      <h3 style="background: #f4f4f4; padding: 16px; border-radius: 8px; font-family: monospace;">${newTempPassword}</h3>
      <p>To get started:</p>
      <ol>
        <li>Visit <a href="${appUrl}/auth">${appUrl}/auth</a></li>
        <li>Log in with your email (${userEmail}) and the temporary password above</li>
        <li>You'll be prompted to change your password on first login</li>
      </ol>
      <p style="margin-top: 24px;">
        <a href="${appUrl}/auth" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Access Nest Pro CRM</a>
      </p>
      <p style="margin-top: 24px; color: #666;">If you have any questions, please contact your administrator.</p>
    `;

    try {
      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: [userEmail],
        subject: "Welcome to Nest Pro CRM - Your Account is Ready",
        html: htmlContent,
      });

      console.log("Invitation email sent successfully:", emailResponse);

      // Log the email
      await supabase.rpc('log_email', {
        p_recipient_email: userEmail,
        p_recipient_user_id: userId,
        p_subject: "Welcome to Nest Pro CRM - Your Account is Ready",
        p_email_type: 'invitation_reminder',
        p_status: 'sent',
        p_resend_email_id: emailResponse.data?.id || null,
        p_metadata: { sent_by_admin: adminUser?.id }
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Invitation reminder sent successfully",
          emailId: emailResponse.data?.id
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (emailError: any) {
      console.error("Error sending invitation email:", emailError);
      
      // Log failed email attempt
      try {
        await supabase.rpc('log_email', {
          p_recipient_email: userEmail,
          p_recipient_user_id: userId,
          p_subject: "Welcome to Nest Pro CRM - Your Account is Ready",
          p_email_type: 'invitation_reminder',
          p_status: 'failed',
          p_error_message: emailError.message,
          p_metadata: { sent_by_admin: adminUser?.id }
        });
      } catch (logError) {
        console.error("Error logging failed email:", logError);
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to send email",
          details: emailError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in resend-invitation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
