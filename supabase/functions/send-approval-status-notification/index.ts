import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit } from '../_shared/rateLimiting.ts';

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

    // Authenticate and check rate limit
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!authError && user) {
        const rateLimitResponse = await checkRateLimit(supabase, user.id, 'send-approval-status-notification');
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
    }

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
    const title = isApproved ? "Account Approved - Welcome!" : "Account Registration Update";
    const message = isApproved 
      ? "Great news! Your account has been approved by an administrator. You can now access all features of the CRM system."
      : "Your account registration has not been approved at this time. If you believe this is an error, please contact the administrator.";

    // Create notification using unified system
    const { data: notification, error: notificationError } = await supabase
      .rpc('create_notification', {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_link_url: isApproved ? '/dashboard' : null,
        p_action_required: false
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
    console.error("Error in send-approval-status-notification:", error);
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
