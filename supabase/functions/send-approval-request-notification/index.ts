import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit } from '../_shared/rateLimiting.ts';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Send email to all admins
    const emailResponse = await resend.emails.send({
      from: "CRM Notifications <notifications@nestpro-connector.com>",
      to: adminEmails,
      subject: "New User Approval Request",
      html: `
        <h2>New User Approval Request</h2>
        <p>A new user has signed up and is awaiting approval:</p>
        <ul>
          <li><strong>Name:</strong> ${userName}</li>
          <li><strong>Email:</strong> ${userEmail}</li>
          <li><strong>User ID:</strong> ${userId}</li>
        </ul>
        <p>Please review and approve/reject this user in the admin panel.</p>
      `,
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
    console.error("Error in send-approval-request-notification:", error);
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
