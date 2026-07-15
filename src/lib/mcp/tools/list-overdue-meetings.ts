import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_overdue_meetings",
  title: "List overdue meetings",
  description:
    "List meetings for the signed-in user that were scheduled in the past but have no completed_date set.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const now = new Date().toISOString();
    const { data, error } = await supabaseForUser(ctx)
      .from("outreach_activities")
      .select("id, scheduled_date, company_id, activity_type, outcome, notes")
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .eq("activity_type", "meeting")
      .lt("scheduled_date", now)
      .is("completed_date", null)
      .order("scheduled_date", { ascending: true })
      .limit(50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { count: data?.length ?? 0, meetings: data ?? [] },
    };
  },
});
