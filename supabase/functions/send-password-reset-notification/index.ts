import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetNotificationRequest {
  userId: string;
  resetByAdmin: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, resetByAdmin }: PasswordResetNotificationRequest = await req.json();

    console.log("Processing password reset notification for user:", userId);

    // Get user's email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData) {
      throw new Error("User not found");
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    const htmlContent = resetByAdmin
      ? `
        <h2>Password Reset by Administrator</h2>
        <p>Your password has been reset by an administrator.</p>
        <p>You can now log in with your new password.</p>
        <p>If you did not request this change, please contact an administrator immediately.</p>
      `
      : `
        <h2>Password Successfully Reset</h2>
        <p>Your password has been successfully reset.</p>
        <p>You can now log in with your new password.</p>
        <p>If you did not make this change, please contact support immediately.</p>
      `;

    // Send email to user
    const emailResponse = await resend.emails.send({
      from: "CRM Notifications <onboarding@resend.dev>",
      to: [userEmail],
      subject: "Password Reset Confirmation",
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
    console.error("Error in send-password-reset-notification:", error);
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
