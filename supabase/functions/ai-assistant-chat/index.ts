// AI Assistant Chat
// - Non-streaming chat using Lovable AI Gateway (Gemini 2.5 Flash) with tool calling
// - Read tools execute immediately (search_companies, list_overdue_meetings, list_my_hot_leads)
// - Write tools (reassign, mark_read, snooze, enrich, create_activity) return a
//   "proposed_action" payload; the client confirms, then calls action=execute to run it.
// - All write actions logged to ai_action_log.

import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: any[] };

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_my_hot_leads",
      description: "List the current user's hot leads (P1 priority companies). Returns top 10 by score.",
      parameters: { type: "object", properties: { limit: { type: "number", description: "Max results, default 10" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "list_overdue_meetings",
      description: "List meetings scheduled in the past with no completion date for the current user.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search_companies",
      description: "Search companies by name (partial match).",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_unread_notifications",
      description: "List the current user's unread notifications.",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_mark_notification_read",
      description: "Propose marking a notification as read. Requires user confirmation before executing.",
      parameters: { type: "object", properties: { notification_id: { type: "string" }, notification_title: { type: "string" } }, required: ["notification_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_mark_all_notifications_read",
      description: "Propose marking ALL of the user's unread notifications as read. Requires confirmation.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_trigger_enrichment",
      description: "Propose enriching a company via Apollo/Deepseek. Requires confirmation.",
      parameters: { type: "object", properties: { company_id: { type: "string" }, company_name: { type: "string" } }, required: ["company_id"] },
    },
  },
];

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const serviceClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action ?? "chat";

    // ===== Execute confirmed action =====
    if (action === "execute") {
      const { action_id } = body;
      if (!action_id) {
        return new Response(JSON.stringify({ error: "action_id required" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const result = await executeAction(serviceClient, user.id, action_id);
      return new Response(JSON.stringify(result), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ===== Chat =====
    const messages: Msg[] = body.messages ?? [];
    const systemPrompt = `You are the Nest Pro AI Assistant inside a CRM. You help the logged-in sales user manage hot leads, overdue meetings, and notifications.

You have read-only tools that execute immediately and "propose_*" tools that require human confirmation before any change is made.

Rules:
- Be concise. Use bullet points when listing records.
- When the user asks to take an action that modifies data (mark read, reassign, enrich), call the matching "propose_*" tool. Do NOT pretend you completed the action.
- Always include the record name / title alongside the id in your replies.
- If the user asks "what's hot" or "what needs attention", call list_my_hot_leads and list_overdue_meetings.
- Today is ${new Date().toISOString().slice(0, 10)}.`;

    const fullMessages: Msg[] = [{ role: "system", content: systemPrompt }, ...messages];

    // Tool-loop: at most 3 rounds
    const proposedActions: any[] = [];
    for (let round = 0; round < 3; round++) {
      const resp = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: fullMessages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
          status: 402, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (!resp.ok) {
        const t = await resp.text();
        return new Response(JSON.stringify({ error: `AI error ${resp.status}: ${t.slice(0, 300)}` }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const json = await resp.json();
      const choice = json.choices?.[0];
      const message = choice?.message;
      if (!message) break;

      // No tool calls: this is the final reply.
      if (!message.tool_calls?.length) {
        fullMessages.push({ role: "assistant", content: message.content ?? "" });
        break;
      }

      // Execute tool calls
      fullMessages.push({ role: "assistant", content: message.content ?? "", tool_calls: message.tool_calls });

      for (const tc of message.tool_calls) {
        const name = tc.function?.name;
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments ?? "{}"); } catch { /* ignore */ }

        let toolResult: any = {};
        try {
          toolResult = await runTool(serviceClient, user.id, name, args, proposedActions);
        } catch (e) {
          toolResult = { error: String(e) };
        }
        fullMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult).slice(0, 8000),
        });
      }
    }

    const finalMsg = [...fullMessages].reverse().find((m) => m.role === "assistant" && (!m.tool_calls || m.tool_calls.length === 0));
    return new Response(JSON.stringify({
      reply: finalMsg?.content ?? "(no response)",
      proposed_actions: proposedActions,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ai-assistant-chat]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

async function runTool(client: any, userId: string, name: string, args: any, proposedActions: any[]) {
  switch (name) {
    case "list_my_hot_leads": {
      const limit = Math.min(Number(args.limit ?? 10), 25);
      const { data } = await client
        .from("companies")
        .select("id, company_name, lead_score, priority_tier, city, state")
        .or(`assigned_to_sales_rep_id.eq.${userId},created_by.eq.${userId}`)
        .gte("lead_score", 80)
        .order("lead_score", { ascending: false })
        .limit(limit);
      return { count: data?.length ?? 0, companies: data ?? [] };
    }
    case "list_overdue_meetings": {
      const now = new Date().toISOString();
      const { data } = await client
        .from("outreach_activities")
        .select("id, scheduled_date, company_id, activity_type, outcome")
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
        .eq("activity_type", "meeting")
        .lt("scheduled_date", now)
        .is("completed_date", null)
        .limit(20);
      return { count: data?.length ?? 0, meetings: data ?? [] };
    }
    case "search_companies": {
      const q = String(args.query ?? "").slice(0, 100);
      if (!q) return { error: "query required" };
      const { data } = await client
        .from("companies")
        .select("id, company_name, lead_score, priority_tier")
        .ilike("company_name", `%${q}%`)
        .limit(15);
      return { count: data?.length ?? 0, companies: data ?? [] };
    }
    case "list_my_unread_notifications": {
      const limit = Math.min(Number(args.limit ?? 10), 25);
      const { data } = await client
        .from("notifications")
        .select("id, type, title, message, created_at, link_url")
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(limit);
      return { count: data?.length ?? 0, notifications: data ?? [] };
    }
    case "propose_mark_notification_read": {
      const { data } = await client.from("ai_action_log").insert({
        user_id: userId,
        action_name: "mark_notification_read",
        target_table: "notifications",
        target_id: args.notification_id,
        payload: { notification_id: args.notification_id, notification_title: args.notification_title },
        status: "pending",
      }).select().single();
      proposedActions.push({ id: data?.id, action: "mark_notification_read", label: `Mark "${args.notification_title ?? "notification"}" as read`, args });
      return { proposed: true, action_id: data?.id, requires_confirmation: true };
    }
    case "propose_mark_all_notifications_read": {
      const { data } = await client.from("ai_action_log").insert({
        user_id: userId,
        action_name: "mark_all_notifications_read",
        payload: {},
        status: "pending",
      }).select().single();
      proposedActions.push({ id: data?.id, action: "mark_all_notifications_read", label: "Mark ALL unread notifications as read", args: {} });
      return { proposed: true, action_id: data?.id, requires_confirmation: true };
    }
    case "propose_trigger_enrichment": {
      const { data } = await client.from("ai_action_log").insert({
        user_id: userId,
        action_name: "trigger_enrichment",
        target_table: "companies",
        target_id: args.company_id,
        payload: args,
        status: "pending",
      }).select().single();
      proposedActions.push({ id: data?.id, action: "trigger_enrichment", label: `Enrich ${args.company_name ?? args.company_id}`, args });
      return { proposed: true, action_id: data?.id, requires_confirmation: true };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function executeAction(client: any, userId: string, actionId: string) {
  const { data: action, error } = await client
    .from("ai_action_log")
    .select("*")
    .eq("id", actionId)
    .eq("user_id", userId)
    .single();

  if (error || !action) return { ok: false, error: "Action not found" };
  if (action.status !== "pending") return { ok: false, error: `Action already ${action.status}` };

  let result: any = {};
  let status: "executed" | "failed" = "executed";
  let errMsg: string | undefined;

  try {
    switch (action.action_name) {
      case "mark_notification_read": {
        const { error: e } = await client
          .from("notifications")
          .update({ read: true, read_at: new Date().toISOString() })
          .eq("id", action.target_id)
          .eq("user_id", userId);
        if (e) throw e;
        result = { ok: true, notification_id: action.target_id };
        break;
      }
      case "mark_all_notifications_read": {
        const { error: e, count } = await client
          .from("notifications")
          .update({ read: true, read_at: new Date().toISOString() }, { count: "exact" })
          .eq("user_id", userId)
          .eq("read", false);
        if (e) throw e;
        result = { ok: true, marked_count: count ?? 0 };
        break;
      }
      case "trigger_enrichment": {
        const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-company`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ company_id: action.target_id }),
        });
        result = { ok: resp.ok, status: resp.status };
        if (!resp.ok) throw new Error(`enrich-company returned ${resp.status}`);
        break;
      }
      default:
        throw new Error(`Unknown action: ${action.action_name}`);
    }
  } catch (e) {
    status = "failed";
    errMsg = String(e);
    result = { ok: false, error: errMsg };
  }

  await client.from("ai_action_log").update({
    status,
    confirmed_by_user: true,
    result,
    error_message: errMsg,
    executed_at: new Date().toISOString(),
  }).eq("id", actionId);

  return result;
}
