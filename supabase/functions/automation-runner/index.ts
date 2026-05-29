// Automation runner — single entry point invoked by pg_cron.
// Dispatches by rule_key to the correct flow handler.
// Records execution in automation_runs, including dry_run payloads and errors.
// On failure, queues automation-self-heal for retry analysis.

import { getCorsHeaders } from "../_shared/cors.ts";
import { buildContext, getServiceClient, type AutomationRuleRow } from "../_shared/automationContext.ts";
import { verifyCronRequest } from "../_shared/cronAuth.ts";

interface RunRequest {
  rule_key?: string;
  rule_keys?: string[];
  force?: boolean; // bypass mode==disabled check
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const authError = verifyCronRequest(req, cors);
  if (authError) return authError;

  try {
    const body: RunRequest = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const client = getServiceClient();

    let q = client.from("automation_rules").select("*").neq("mode", "disabled");
    if (body.rule_key) q = q.eq("rule_key", body.rule_key);
    if (body.rule_keys?.length) q = q.in("rule_key", body.rule_keys);

    const { data: rules, error } = await q;
    if (error) throw error;

    const results = [];
    for (const rule of (rules ?? []) as AutomationRuleRow[]) {
      const result = await runRule(client, rule);
      results.push(result);
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[automation-runner] fatal", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

async function runRule(client: ReturnType<typeof getServiceClient>, rule: AutomationRuleRow) {
  // Cost ceiling: max_runs_per_day
  const maxRunsPerDay = (rule.cost_ceilings as any)?.max_runs_per_day ?? 96;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: runsToday } = await client
    .from("automation_runs")
    .select("id", { count: "exact", head: true })
    .eq("rule_id", rule.id)
    .gte("started_at", since);

  if ((runsToday ?? 0) >= maxRunsPerDay) {
    return { rule_key: rule.rule_key, skipped: "max_runs_per_day_reached" };
  }

  // Create run row
  const { data: runRow, error: runErr } = await client
    .from("automation_runs")
    .insert({
      rule_id: rule.id,
      rule_key: rule.rule_key,
      status: "running",
      mode: rule.mode,
    })
    .select()
    .single();

  if (runErr || !runRow) {
    console.error("[automation-runner] failed to create run row", runErr);
    return { rule_key: rule.rule_key, error: runErr?.message };
  }

  const startedAt = Date.now();
  const ctx = buildContext(client, rule, runRow.id);

  try {
    await dispatchFlow(ctx);

    const finalStatus = rule.mode === "dry_run" ? "dry_run" : "success";
    await client.from("automation_runs").update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      rows_scanned: ctx.stats.rows_scanned,
      rows_acted_on: ctx.stats.rows_acted_on,
      notifications_sent: ctx.stats.notifications_sent,
      ai_calls_used: ctx.stats.ai_calls_used,
      dry_run_payload: rule.mode === "dry_run" ? ctx.dryRunPayload : null,
    }).eq("id", runRow.id);

    await client.from("automation_rules").update({
      last_run_at: new Date().toISOString(),
      last_run_status: finalStatus,
    }).eq("id", rule.id);

    return { rule_key: rule.rule_key, status: finalStatus, stats: ctx.stats };
  } catch (err) {
    const error = err as Error;
    console.error(`[automation-runner] ${rule.rule_key} failed`, error);

    // Count recent failures for this rule
    const { data: recentRuns } = await client
      .from("automation_runs")
      .select("id, attempt_number, fix_attempts")
      .eq("rule_id", rule.id)
      .eq("status", "error")
      .order("started_at", { ascending: false })
      .limit(3);

    const lastAttempt = recentRuns?.[0]?.attempt_number ?? 0;
    const nextAttempt = lastAttempt + 1;
    const shouldFlag = nextAttempt >= 3;

    await client.from("automation_runs").update({
      status: "error",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      error_message: error.message,
      error_stack: error.stack?.slice(0, 4000),
      error_category: categorizeError(error.message),
      attempt_number: nextAttempt,
      flagged_for_review: shouldFlag,
      rows_scanned: ctx.stats.rows_scanned,
      ai_calls_used: ctx.stats.ai_calls_used,
    }).eq("id", runRow.id);

    if (shouldFlag) {
      await client.from("automation_rules").update({
        mode: "disabled",
        flagged_for_review: true,
        flagged_reason: `Failed ${nextAttempt} consecutive runs. Last error: ${error.message}`,
        last_run_at: new Date().toISOString(),
        last_run_status: "error",
      }).eq("id", rule.id);

      // Notify admins
      const { data: admins } = await client.rpc("get_user_role" as any, {}).select?.() ?? { data: null };
      const { data: adminUsers } = await client
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      for (const admin of adminUsers ?? []) {
        await client.from("notifications").insert({
          user_id: admin.user_id,
          type: "automation_flagged",
          title: `Automation flagged: ${rule.name}`,
          message: `Disabled after 3 failed attempts. Last error: ${error.message.slice(0, 200)}`,
          link_url: "/automation-admin",
        });
      }
    } else {
      // Trigger self-heal in the background (fire-and-forget)
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-self-heal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ rule_id: rule.id, run_id: runRow.id }),
        });
      } catch (e) {
        console.error("[automation-runner] self-heal trigger failed", e);
      }
    }

    return { rule_key: rule.rule_key, error: error.message, attempt: nextAttempt, flagged: shouldFlag };
  }
}

function categorizeError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("timeout") || m.includes("etimedout")) return "timeout";
  if (m.includes("rate") || m.includes("429")) return "rate_limit";
  if (m.includes("permission") || m.includes("rls") || m.includes("denied")) return "permission";
  if (m.includes("not found") || m.includes("404")) return "not_found";
  if (m.includes("network") || m.includes("fetch")) return "network";
  if (m.includes("ai") || m.includes("gemini") || m.includes("model")) return "ai_provider";
  return "unknown";
}

async function dispatchFlow(ctx: ReturnType<typeof buildContext>) {
  switch (ctx.rule.flow_type) {
    case "hot_lead": return await hotLeadFlow(ctx);
    case "stale_opportunity": return await staleOpportunityFlow(ctx);
    case "meeting_followup": return await meetingFollowupFlow(ctx);
    case "enrichment_backfill": return await enrichmentBackfillFlow(ctx);
    default: throw new Error(`Unknown flow_type: ${ctx.rule.flow_type}`);
  }
}

// ---------- FLOW 1: Hot lead detection ----------
async function hotLeadFlow(ctx: ReturnType<typeof buildContext>) {
  const minScore = Number((ctx.rule.config as any).min_score ?? 80);
  const lookbackMin = Number((ctx.rule.config as any).lookback_minutes ?? 60);
  const since = new Date(Date.now() - lookbackMin * 60 * 1000).toISOString();
  const maxRows = ctx.rule.safety_limits?.max_rows_per_run ?? 500;

  const { data: companies, error } = await ctx.client
    .from("companies")
    .select("id, company_name, lead_score, priority_tier, assigned_to_sales_rep_id, created_by, score_calculated_at")
    .gte("lead_score", minScore)
    .gte("score_calculated_at", since)
    .limit(maxRows);

  if (error) throw error;
  ctx.stats.rows_scanned = companies?.length ?? 0;

  for (const c of companies ?? []) {
    const ownerId = c.assigned_to_sales_rep_id ?? c.created_by;
    if (!ownerId) continue;

    const result = await ctx.sendNotification({
      user_id: ownerId,
      type: "automation_hot_lead",
      title: `🔥 Hot lead: ${c.company_name}`,
      message: `Score ${c.lead_score} (${c.priority_tier ?? "P1"}). Reach out today.`,
      link_url: `/companies?id=${c.id}`,
      target_id: c.id,
      target_table: "companies",
      dedupe_window_minutes: 60 * 24,
    });

    if (result.ok) ctx.stats.rows_acted_on += 1;
  }
}

// ---------- FLOW 2: Stale opportunity ----------
async function staleOpportunityFlow(ctx: ReturnType<typeof buildContext>) {
  const daysInactive = Number((ctx.rule.config as any).days_inactive ?? 14);
  const cutoff = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000).toISOString();
  const maxRows = ctx.rule.safety_limits?.max_rows_per_run ?? 500;

  const { data: opps, error } = await ctx.client
    .from("opportunities")
    .select("id, opportunity_name, stage, updated_at, assigned_to_sales_rep_id, created_by")
    .lt("updated_at", cutoff)
    .not("stage", "in", '("Closed Won","Closed Lost","closed_won","closed_lost")')
    .limit(maxRows);

  if (error) throw error;
  ctx.stats.rows_scanned = opps?.length ?? 0;

  for (const o of opps ?? []) {
    const ownerId = o.assigned_to_sales_rep_id ?? o.created_by;
    if (!ownerId) continue;

    const result = await ctx.sendNotification({
      user_id: ownerId,
      type: "automation_stale_opportunity",
      title: `⚠️ Stale opportunity: ${o.opportunity_name}`,
      message: `No activity in ${daysInactive}+ days. Stage: ${o.stage ?? "unknown"}.`,
      link_url: `/opportunities?id=${o.id}`,
      target_id: o.id,
      target_table: "opportunities",
      dedupe_window_minutes: 60 * 24 * 3,
    });
    if (result.ok) ctx.stats.rows_acted_on += 1;
  }
}

// ---------- FLOW 3: Meeting follow-up ----------
async function meetingFollowupFlow(ctx: ReturnType<typeof buildContext>) {
  const now = new Date().toISOString();
  const maxRows = ctx.rule.safety_limits?.max_rows_per_run ?? 500;

  const { data: activities, error } = await ctx.client
    .from("outreach_activities")
    .select("id, activity_type, scheduled_date, completed_date, assigned_to, created_by, company_id, outcome")
    .eq("activity_type", "meeting")
    .lt("scheduled_date", now)
    .is("completed_date", null)
    .neq("outcome", "Cancelled")
    .limit(maxRows);

  if (error) throw error;
  ctx.stats.rows_scanned = activities?.length ?? 0;

  for (const a of activities ?? []) {
    const ownerId = a.assigned_to ?? a.created_by;
    if (!ownerId) continue;

    const result = await ctx.sendNotification({
      user_id: ownerId,
      type: "automation_meeting_followup",
      title: `📅 Meeting needs follow-up`,
      message: `Past scheduled date with no completion. Update outcome.`,
      link_url: `/activities?id=${a.id}`,
      target_id: a.id,
      target_table: "outreach_activities",
      dedupe_window_minutes: 60 * 12,
    });
    if (result.ok) ctx.stats.rows_acted_on += 1;
  }
}

// ---------- FLOW 4: Enrichment backfill ----------
async function enrichmentBackfillFlow(ctx: ReturnType<typeof buildContext>) {
  const batchSize = Number((ctx.rule.config as any).batch_size ?? 50);
  const maxAiCalls = ctx.rule.cost_ceilings?.max_ai_calls_per_run ?? 50;
  const limit = Math.min(batchSize, maxAiCalls);

  const { data: companies, error } = await ctx.client
    .from("companies")
    .select("id, company_name, website_url, lead_score")
    .or("website_url.not.is.null,company_name.not.is.null")
    .order("lead_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  ctx.stats.rows_scanned = companies?.length ?? 0;

  // In dry_run, just log what we'd enrich; in live, fire enrich-company
  for (const c of companies ?? []) {
    if (!ctx.incrementAiCalls(1)) break;

    if (ctx.mode === "dry_run") {
      ctx.dryRunPayload.push({ op: "enrich", company_id: c.id, name: c.company_name });
      ctx.stats.rows_acted_on += 1;
      continue;
    }

    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ company_id: c.id, source: "automation_backfill" }),
      });
      ctx.stats.rows_acted_on += 1;
    } catch (e) {
      console.warn(`[enrichment_backfill] enrich failed for ${c.id}`, e);
    }
  }
}
