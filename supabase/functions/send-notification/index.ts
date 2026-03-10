import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Nest Pro <info@nestproconnector.com>";

interface NotificationPayload {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    const { notification_id, user_id, type, title, message, link_url } = payload;

    if (!notification_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing notification_id or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate that the notification actually exists, belongs to the user, and hasn't been sent yet
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select("id, user_id, read")
      .eq("id", notification_id)
      .eq("user_id", user_id)
      .single();

    if (notifError || !notification) {
      console.error("Notification validation failed:", notifError);
      return new Response(
        JSON.stringify({ error: "Invalid or already processed notification" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
      throw prefError;
    }

    // Check if email notifications are enabled for this type
    const shouldSendEmail = preferences.delivery_method === "email" || preferences.delivery_method === "both";
    
    let emailEnabled = false;
    switch (type) {
      case "access_request":
        emailEnabled = preferences.access_requests;
        break;
      case "access_approved":
      case "access_denied":
        emailEnabled = preferences.access_status;
        break;
      case "access_expiring":
        emailEnabled = preferences.access_expiring;
        break;
      case "access_revoked":
        emailEnabled = preferences.access_revoked;
        break;
      case "communication_view_request":
        emailEnabled = preferences.communication_requests;
        break;
      case "appeal_submitted":
        emailEnabled = preferences.appeal_submitted;
        break;
      default:
        emailEnabled = true;
    }

    if (!shouldSendEmail || !emailEnabled) {
      console.log(`Email notification skipped for user ${user_id}, type ${type}`);
      return new Response(
        JSON.stringify({ message: "Notification created (email skipped based on preferences)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !userData.user) {
      throw new Error("User not found");
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Send email via Resend
    if (RESEND_API_KEY) {
      const emailHtml = `
        <h2>${title}</h2>
        <p>${message}</p>
        ${link_url ? `<p><a href="${link_url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Details</a></p>` : ''}
        <hr />
        <p style="color: #666; font-size: 12px;">You received this email because you have notifications enabled in your account settings.</p>
      `;

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: [userEmail],
            subject: title,
            html: emailHtml,
          }),
        });

        if (!resendResponse.ok) {
          const error = await resendResponse.text();
          console.error("Resend API error:", error);
          throw new Error(`Failed to send email: ${error}`);
        }

        const emailData = await resendResponse.json();
        console.log(`Email sent to ${userEmail} for notification ${notification_id}`);

        // Mark notification as read to prevent re-sending
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notification_id);

        // Log the email
        await supabase.rpc('log_email', {
          p_recipient_email: userEmail,
          p_recipient_user_id: user_id,
          p_subject: title,
          p_email_type: type,
          p_status: 'sent',
          p_resend_email_id: emailData?.id || null,
          p_metadata: { notification_id }
        });
      } catch (error: any) {
        console.error("Error sending or logging email:", error);
        
        try {
          await supabase.rpc('log_email', {
            p_recipient_email: userEmail,
            p_recipient_user_id: user_id,
            p_subject: title,
            p_email_type: type,
            p_status: 'failed',
            p_error_message: error.message,
            p_metadata: { notification_id }
          });
        } catch (logError) {
          console.error("Error logging failed email:", logError);
        }
        throw error;
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email send");
    }

    return new Response(
      JSON.stringify({ message: "Notification sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process notification" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
