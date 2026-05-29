import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyResetCodeRequest {
  email: string;
  code: string;
  newPassword: string;
}

// Hash the code for verification
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, code, newPassword }: VerifyResetCodeRequest = await req.json();

    // Enforce password complexity (must match signup policy)
    if (
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      newPassword.length > 128 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    ) {
      return new Response(
        JSON.stringify({ error: "Password must be 8+ characters and include an uppercase letter, a number, and a special character." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Verifying reset code for email:", email);

    // Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error("Failed to lookup user");
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error("User not found");
    }

    // Hash the provided code
    const codeHash = await hashCode(code);

    // Find valid reset code
    const { data: resetCodes, error: codeError } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (codeError) {
      console.error("Error looking up reset code:", codeError);
      throw new Error("Failed to verify code");
    }

    if (!resetCodes || resetCodes.length === 0) {
      throw new Error("Invalid or expired reset code");
    }

    const resetCode = resetCodes[0];

    // Update user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Failed to update password");
    }

    // Mark code as used
    const { error: markUsedError } = await supabase
      .from('password_reset_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetCode.id);

    if (markUsedError) {
      console.error("Error marking code as used:", markUsedError);
    }

    console.log("Password successfully reset for user:", user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Password successfully reset" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-reset-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
