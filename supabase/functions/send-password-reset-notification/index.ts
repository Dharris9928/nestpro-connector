import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetNotificationRequest {
  userId: string;
  resetByAdmin: boolean;
  tempPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate and check rate limit
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!authError && user) {
        const rateLimitResponse = await checkRateLimit(supabase, user.id, 'send-password-reset-notification');
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
    }

    const { userId, resetByAdmin, tempPassword }: PasswordResetNotificationRequest = await req.json();

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

    const title = resetByAdmin && tempPassword 
      ? "Password Reset - Action Required" 
      : "Password Reset Confirmation";
    
    const message = resetByAdmin && tempPassword
      ? `Your password has been reset by an administrator. Your temporary password is: ${tempPassword}. Please log in and change your password immediately.`
      : "Your password has been successfully reset. You can now log in with your new password.";

    // Create notification using unified system
    const { data: notification, error: notificationError } = await supabase
      .rpc('create_notification', {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_link_url: '/auth',
        p_action_required: resetByAdmin && !!tempPassword
      });

    if (notificationError) {
      throw notificationError;
    }

    console.log("Notification created successfully:", notification);

    return new Response(
      JSON.stringify({ success: true, notificationId: notification }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-password-reset-notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
