import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  userEmail: string;
  firstName?: string;
  lastName?: string;
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
        const rateLimitResponse = await checkRateLimit(supabase, user.id, 'send-approval-request-notification');
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
    }

    const { userId, userEmail, firstName, lastName }: NotificationRequest = await req.json();

    console.log("Processing approval request notification for user:", userId);

    // Get all admin emails
    const { data: admins, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) throw adminError;

    if (!admins || admins.length === 0) {
      console.log("No admins found to notify");
      return new Response(
        JSON.stringify({ success: false, message: "No admins found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin user details
    const adminIds = admins.map(a => a.user_id);
    const { data: adminUsers, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) throw userError;

    const adminEmails = adminUsers.users
      .filter(user => adminIds.includes(user.id))
      .map(user => user.email)
      .filter((email): email is string => Boolean(email));

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ success: false, message: "No admin emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userName = firstName && lastName ? `${firstName} ${lastName}` : userEmail;

    // Create notifications for all admins using unified system
    const notificationPromises = adminIds.map(adminId => 
      supabase.rpc('create_notification', {
        p_user_id: adminId,
        p_title: 'New User Approval Request',
        p_message: `${userName} (${userEmail}) has signed up and is awaiting approval.`,
        p_link_url: '/settings',
        p_action_required: true
      })
    );

    const results = await Promise.all(notificationPromises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      console.error("Some notifications failed:", errors);
    }

    console.log(`Created ${results.length - errors.length} notifications for admins`);

    return new Response(
      JSON.stringify({ success: true, notificationsSent: results.length - errors.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-approval-request-notification:", error);
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
