// Automation self-heal: Gemini analyzes the failed run and proposes a fix.
// Records the attempt in automation_runs.fix_attempts JSONB array.
// Hard cap of 3 attempts is enforced by the runner, not here.
// This function only proposes & records — it does NOT execute fixes automatically.
// The runner re-tries the rule on its next cron tick, and the proposed fix
// is visible in the admin UI so a human can apply it manually if needed.

import { getCorsHeaders } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/automationContext.ts";
import { verifyCronRequest } from "../_shared/cronAuth.ts";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const authError = verifyCronRequest(req, cors);
  if (authError) return authError;

  try {
    const { rule_id, run_id } = await req.json();
    if (!rule_id || !run_id) {
      return new Response(JSON.stringify({ error: "rule_id and run_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const client = getServiceClient();

    const { data: rule } = await client.from("automation_rules").select("*").eq("id", rule_id).single();
    const { data: run } = await client.from("automation_runs").select("*").eq("id", run_id).single();
    if (!rule || !run) throw new Error("rule or run not found");

    // Pull last 3 runs for context
    const { data: recentRuns } = await client
      .from("automation_runs")
      .select("id, status, error_message, error_category, attempt_number, started_at, fix_attempts")
      .eq("rule_id", rule_id)
      .order("started_at", { ascending: false })
      .limit(5);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are an automation self-healing agent. A scheduled CRM automation rule just failed.

RULE:
- Name: ${rule.name}
- Flow type: ${rule.flow_type}
- Config: ${JSON.stringify(rule.config)}
- Safety limits: ${JSON.stringify(rule.safety_limits)}

LATEST FAILURE:
- Attempt: ${run.attempt_number}
- Error category: ${run.error_category}
- Error message: ${run.error_message}
- Stack (truncated): ${(run.error_stack ?? "").slice(0, 1500)}

RECENT RUN HISTORY:
${(recentRuns ?? []).map((r: any) => `- ${r.started_at} | ${r.status} | attempt ${r.attempt_number} | ${r.error_category ?? ""} | ${(r.error_message ?? "").slice(0, 200)}`).join("\n")}

Return JSON with this exact shape:
{
  "hypothesis": "short root cause guess",
  "proposed_fix": "concrete action a developer or admin should take",
  "action_type": "retry_smaller_batch" | "skip_bad_record" | "adjust_filter" | "increase_timeout" | "manual_review_required",
  "confidence": "high" | "medium" | "low"
}`;

    const aiResp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      throw new Error(`AI gateway ${aiResp.status}: ${txt.slice(0, 300)}`);
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let analysis: any = {};
    try { analysis = JSON.parse(content); } catch { analysis = { hypothesis: content }; }

    const fixAttempt = {
      attempt_number: run.attempt_number,
      timestamp: new Date().toISOString(),
      hypothesis: analysis.hypothesis ?? null,
      proposed_fix: analysis.proposed_fix ?? null,
      action_type: analysis.action_type ?? null,
      confidence: analysis.confidence ?? null,
      outcome: "proposed",
    };

    const merged = [...(run.fix_attempts ?? []), fixAttempt];
    await client.from("automation_runs").update({ fix_attempts: merged }).eq("id", run_id);

    return new Response(JSON.stringify({ ok: true, fix: fixAttempt }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[automation-self-heal]", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
