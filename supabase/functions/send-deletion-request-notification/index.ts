import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeletionNotificationRequest {
  requestId: string;
  tableName: string;
  requestedByEmail: string;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requestId, tableName, requestedByEmail, reason }: DeletionNotificationRequest = await req.json();

    console.log("Processing deletion request notification for request:", requestId);

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
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ success: false, message: "No admin emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email to all admins
    const emailResponse = await resend.emails.send({
      from: "CRM Notifications <onboarding@resend.dev>",
      to: adminEmails,
      subject: "New Deletion Request",
      html: `
        <h2>New Deletion Request</h2>
        <p>A user has requested to delete a record:</p>
        <ul>
          <li><strong>Requested By:</strong> ${requestedByEmail}</li>
          <li><strong>Table:</strong> ${tableName}</li>
          ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
          <li><strong>Request ID:</strong> ${requestId}</li>
        </ul>
        <p>Please review and approve/reject this deletion request in the admin panel.</p>
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
    console.error("Error in send-deletion-request-notification:", error);
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
