import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestResetRequest {
  email: string;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email }: RequestResetRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log("Password reset requested for email:", email);

    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error("Failed to lookup user");
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with this email, a reset code has been sent."
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate reset code
    const code = generateResetCode();
    const codeHash = await hashCode(code);

    // Store code in database
    const { error: insertError } = await supabase
      .from('password_reset_codes')
      .insert({
        user_id: user.id,
        code: code,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      });

    if (insertError) {
      console.error("Error storing reset code:", insertError);
      throw new Error("Failed to generate reset code");
    }

    // Try to send email if RESEND_API_KEY is configured
    let emailSent = false;

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
          <p style="margin-top: 24px; color: #666;">If you did not request this code, please ignore this email.</p>
        `;

        const emailResponse = await resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: `Your Password Reset Code: ${code}`,
          html: htmlContent,
          text: `Your password reset code is: ${code}\nThis code will expire in 15 minutes.\nReset here: ${resetUrl}`,
        });

        console.log("Email sent successfully:", emailResponse);
        emailSent = true;
      } catch (error: any) {
        console.error("Error sending email:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        message: "If an account exists with this email, a reset code has been sent."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in request-password-reset:", error);
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
