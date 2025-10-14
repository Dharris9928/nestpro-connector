import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { requireAdmin } from '../_shared/authorization.ts';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateResetCodeRequest {
  userId: string;
}

// Generate a secure 6-digit code
function generateResetCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

// Hash the code for storage
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin authorization
    const { user, supabase } = await requireAdmin(req);

    const { userId }: GenerateResetCodeRequest = await req.json();

    console.log("Generating reset code for user:", userId);

    // Get user's email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData) {
      throw new Error("User not found");
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Generate reset code
    const code = generateResetCode();
    const codeHash = await hashCode(code);

    // Store code in database
    const { data: resetCodeData, error: insertError } = await supabase
      .from('password_reset_codes')
      .insert({
        user_id: userId,
        code: code, // Store plaintext for admin display (will be deleted after use)
        code_hash: codeHash,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing reset code:", insertError);
      throw new Error("Failed to generate reset code");
    }

    // Try to send email if RESEND_API_KEY is configured
    let emailSent = false;
    let emailError = null;

    if (Deno.env.get("RESEND_API_KEY")) {
      try {
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Lovable <onboarding@resend.dev>";
        const resetUrl = `${Deno.env.get("SUPABASE_URL")?.replace('/supabase', '')}/auth?reset=true`;

        const htmlContent = `
          <h2>Password Reset Code</h2>
          <p>Your password reset code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace; background: #f4f4f4; padding: 16px; border-radius: 8px;">${code}</h1>
          <p>This code will expire in 15 minutes.</p>
          <p>To reset your password, visit:</p>
          <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Your Password</a></p>
          <p>Or copy this link: ${resetUrl}</p>
          <p style="margin-top: 24px; color: #666;">If you did not request this code, please contact an administrator immediately.</p>
        `;

        const emailResponse = await resend.emails.send({
          from: fromEmail,
          to: [userEmail],
          subject: `Your Password Reset Code: ${code}`,
          html: htmlContent,
          text: `Your password reset code is: ${code}\nThis code will expire in 15 minutes.\nReset here: ${resetUrl}`,
        });

        console.log("Email sent successfully:", emailResponse);
        emailSent = true;
      } catch (error: any) {
        console.error("Error sending email:", error);
        emailError = error.message;
      }
    } else {
      console.warn("RESEND_API_KEY not configured - email not sent");
    }

    return new Response(
      JSON.stringify({
        success: true,
        code: code, // Return code for admin display
        codeId: resetCodeData.id,
        expiresAt: resetCodeData.expires_at,
        emailSent,
        emailError,
        message: emailSent 
          ? "Reset code generated and sent via email" 
          : "Reset code generated (email not sent - please provide code to user manually)"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-reset-code:", error);
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
