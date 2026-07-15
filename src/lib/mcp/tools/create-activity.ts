import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_activity",
  title: "Log an activity",
  description:
    "Log a new outreach activity (call, email, meeting, note) against a company for the signed-in user.",
  inputSchema: {
    company_id: z.string().uuid(),
    activity_type: z.enum(["call", "email", "meeting", "note", "task"]),
    notes: z.string().min(1).max(4000),
    scheduled_date: z.string().datetime().optional().describe("ISO timestamp for scheduled/planned activity"),
    outcome: z.string().max(200).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async ({ company_id, activity_type, notes, scheduled_date, outcome }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const { data, error } = await supabaseForUser(ctx)
      .from("outreach_activities")
      .insert({
        company_id,
        activity_type,
        notes,
        scheduled_date: scheduled_date ?? null,
        outcome: outcome ?? null,
        created_by: userId,
        assigned_to: userId,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Activity logged: ${data.id}` }],
      structuredContent: { activity: data },
    };
  },
});
