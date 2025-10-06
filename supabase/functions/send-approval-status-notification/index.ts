import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalStatusNotificationRequest {
  userId: string;
  status: 'approved' | 'rejected';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, status }: ApprovalStatusNotificationRequest = await req.json();

    console.log("Processing approval status notification for user:", userId, "status:", status);

    // Get user's email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData) {
      throw new Error("User not found");
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    const isApproved = status === 'approved';
    const subject = isApproved ? "Account Approved - Welcome!" : "Account Registration Update";
    
    const htmlContent = isApproved 
      ? `
        <h2>Your Account Has Been Approved!</h2>
        <p>Great news! Your account has been approved by an administrator.</p>
        <p>You can now access all features of the CRM system.</p>
        <p>Log in to get started: <a href="${Deno.env.get("SUPABASE_URL")}">Click here to log in</a></p>
      `
      : `
        <h2>Account Registration Update</h2>
        <p>We regret to inform you that your account registration has not been approved at this time.</p>
        <p>If you believe this is an error, please contact the administrator for more information.</p>
      `;

    // Send email to user
    const emailResponse = await resend.emails.send({
      from: "CRM Notifications <onboarding@resend.dev>",
      to: [userEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-approval-status-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
