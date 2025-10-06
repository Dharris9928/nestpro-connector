import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Send email to assigned user
    const emailResponse = await resend.emails.send({
      from: "CRM Notifications <onboarding@resend.dev>",
      to: [userEmail],
      subject: `New Activity Assigned: ${activityType}`,
      html: `
        <h2>New Activity Assigned to You</h2>
        <p>You have been assigned a new activity:</p>
        <ul>
          <li><strong>Company:</strong> ${companyName}</li>
          <li><strong>Activity Type:</strong> ${activityType}</li>
          <li><strong>Scheduled Date:</strong> ${formattedDate}</li>
        </ul>
        <p>Please log in to the CRM to view more details and manage this activity.</p>
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
    console.error("Error in send-activity-assignment-notification:", error);
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
