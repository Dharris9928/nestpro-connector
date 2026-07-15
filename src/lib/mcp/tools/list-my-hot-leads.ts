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
  name: "list_my_hot_leads",
  title: "List my hot leads",
  description:
    "List the signed-in user's hot leads (P1 companies with lead_score >= 80). Returns up to 25 top-scoring companies assigned to or created by the user.",
  inputSchema: {
    limit: z.number().int().min(1).max(25).optional().describe("Max results (default 10)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const cap = limit ?? 10;
    const { data, error } = await supabaseForUser(ctx)
      .from("companies")
      .select("id, company_name, lead_score, priority_tier, city, state, website")
      .or(`assigned_to_sales_rep_id.eq.${userId},created_by.eq.${userId}`)
      .gte("lead_score", 80)
      .order("lead_score", { ascending: false })
      .limit(cap);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { count: data?.length ?? 0, companies: data ?? [] },
    };
  },
});
