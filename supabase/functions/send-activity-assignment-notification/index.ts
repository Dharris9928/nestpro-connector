import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivityNotificationRequest {
  activityId: string;
  assignedToId: string;
  companyName: string;
  activityType: string;
  scheduledDate?: string;
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
        const rateLimitResponse = await checkRateLimit(supabase, user.id, 'send-activity-assignment-notification');
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
    }

    const { activityId, assignedToId, companyName, activityType, scheduledDate }: ActivityNotificationRequest = await req.json();

    console.log("Processing activity assignment notification for user:", assignedToId);

    // Get assigned user's email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(assignedToId);

    if (userError || !userData) {
      throw new Error("User not found");
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    const formattedDate = scheduledDate ? new Date(scheduledDate).toLocaleDateString() : "Not scheduled";

    // Create notification using unified system
    const { data: notification, error: notificationError } = await supabase
      .rpc('create_notification', {
        p_user_id: assignedToId,
        p_title: `New Activity Assigned: ${activityType}`,
        p_message: `You have been assigned a new activity for ${companyName}. Scheduled: ${formattedDate}`,
        p_link_url: `/activities`,
        p_action_required: true
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
    console.error("Error in send-activity-assignment-notification:", error);
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
