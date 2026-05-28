// Shared automation execution context.
// Wraps every DB write performed by an automation rule so we can:
// - Tag the actor (e.g. "automation:hot_lead_detection")
// - Enforce per-run safety limits (max rows touched, max writes, max AI calls)
// - Provide a uniform dry-run path that records what WOULD have happened
// - Track ai-call usage for cost ceilings

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type RuleMode = "live" | "dry_run" | "disabled";

export interface AutomationRuleRow {
  id: string;
  rule_key: string;
  name: string;
  flow_type: string;
  mode: RuleMode;
  config: Record<string, unknown>;
  safety_limits: {
    max_rows_per_run?: number;
    max_writes_per_run?: number;
  };
  cost_ceilings: {
    max_runs_per_day?: number;
    max_ai_calls_per_run?: number;
    max_ai_calls_per_day?: number;
  };
}

export interface AutomationContext {
  client: SupabaseClient;
  rule: AutomationRuleRow;
  runId: string;
  mode: RuleMode;
  actor: string;
  stats: {
    rows_scanned: number;
    rows_acted_on: number;
    notifications_sent: number;
    ai_calls_used: number;
    writes: number;
  };
  dryRunPayload: unknown[];
  // Insert a record OR (in dry_run) log what would have been inserted.
  safeInsert(table: string, row: Record<string, unknown>): Promise<{ ok: boolean; error?: string; data?: unknown }>;
  // Notification helper that respects notification_preferences + dedupe.
  sendNotification(opts: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    link_url?: string;
    target_id?: string;
    target_table?: string;
    dedupe_window_minutes?: number;
    payload?: Record<string, unknown>;
  }): Promise<{ ok: boolean; skipped?: string }>;
  incrementAiCalls(n?: number): boolean;
}

export function buildContext(client: SupabaseClient, rule: AutomationRuleRow, runId: string): AutomationContext {
  const actor = `automation:${rule.rule_key}`;
  const stats = { rows_scanned: 0, rows_acted_on: 0, notifications_sent: 0, ai_calls_used: 0, writes: 0 };
  const dryRunPayload: unknown[] = [];
  const maxWrites = rule.safety_limits?.max_writes_per_run ?? 500;
  const maxAiCallsPerRun = rule.cost_ceilings?.max_ai_calls_per_run ?? 50;

  const ctx: AutomationContext = {
    client,
    rule,
    runId,
    mode: rule.mode,
    actor,
    stats,
    dryRunPayload,

    async safeInsert(table, row) {
      if (stats.writes >= maxWrites) {
        return { ok: false, error: `max_writes_per_run (${maxWrites}) exceeded` };
      }
      if (rule.mode === "dry_run") {
        dryRunPayload.push({ op: "insert", table, row });
        stats.writes += 1;
        return { ok: true };
      }
      const { data, error } = await client.from(table).insert(row).select().single();
      stats.writes += 1;
      if (error) return { ok: false, error: error.message };
      return { ok: true, data };
    },

    async sendNotification(opts) {
      // Idempotency: check automation_action_log first
      const dedupeMinutes = opts.dedupe_window_minutes ?? 60 * 24;
      const dedupeKey = `${opts.type}:${opts.user_id}:${opts.target_id ?? "global"}`;
      const { data: existing } = await client
        .from("automation_action_log")
        .select("id, dedupe_until")
        .eq("rule_id", rule.id)
        .eq("dedupe_key", dedupeKey)
        .gt("dedupe_until", new Date().toISOString())
        .maybeSingle();

      if (existing) return { ok: false, skipped: "duplicate_within_window" };

      // Check notification preferences
      const { data: prefs } = await client
        .from("notification_preferences")
        .select("*")
        .eq("user_id", opts.user_id)
        .maybeSingle();

      if (prefs) {
        const prefKey = automationPrefKey(rule.flow_type);
        if (prefKey && prefs[prefKey] === false) {
          return { ok: false, skipped: "user_preference_disabled" };
        }
      }

      if (rule.mode === "dry_run") {
        dryRunPayload.push({ op: "notification", ...opts });
        stats.notifications_sent += 1;
        return { ok: true };
      }

      // Log action for dedupe
      await client.from("automation_action_log").insert({
        rule_id: rule.id,
        rule_key: rule.rule_key,
        target_table: opts.target_table ?? "notifications",
        target_id: opts.target_id ?? opts.user_id,
        action_type: "notification",
        dedupe_key: dedupeKey,
        dedupe_until: new Date(Date.now() + dedupeMinutes * 60 * 1000).toISOString(),
        payload: opts.payload ?? {},
      });

      const { error } = await client.from("notifications").insert({
        user_id: opts.user_id,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        link_url: opts.link_url,
        read: false,
      });
      if (error) return { ok: false, skipped: error.message };
      stats.notifications_sent += 1;
      stats.writes += 1;
      return { ok: true };
    },

    incrementAiCalls(n = 1) {
      stats.ai_calls_used += n;
      return stats.ai_calls_used <= maxAiCallsPerRun;
    },
  };

  return ctx;
}

function automationPrefKey(flowType: string): string | null {
  switch (flowType) {
    case "hot_lead": return "automation_hot_lead";
    case "stale_opportunity": return "automation_stale_opportunity";
    case "meeting_followup": return "automation_meeting_followup";
    case "enrichment_backfill": return "automation_enrichment";
    default: return null;
  }
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}
