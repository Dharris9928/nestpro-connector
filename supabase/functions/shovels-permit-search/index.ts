import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { getCorsHeaders } from "../_shared/cors.ts";

const SHOVELS = "https://api.shovels.ai/v2";

const Body = z.object({
  states: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(15),
  focus: z.array(z.enum(["new_construction", "large_residential", "hvac", "remodel", "adu", "addition"])).min(1).default(["new_construction"]),
  minUnits: z.number().int().min(2).max(2000).default(50),
  days: z.number().int().min(1).max(365).default(30),
  maxResults: z.number().int().min(1).max(200).default(25),
  statuses: z.array(z.enum(["active", "in_review", "final", "inactive"])).optional(),
});

import { deriveUnits, importPermits } from "./importPermits.ts";
import { discoverDevelopments } from "./developments.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const apiKey = Deno.env.get("SHOVELS_API_KEY");
    if (!apiKey) return json({ error: "Shovels API key is not configured" }, 500);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Not signed in" }, 401);

    const raw = await req.json();
    if (raw?.action === "usage") {
      const r = await fetch(`${SHOVELS}/usage`, { headers: { "X-API-Key": apiKey } });
      if (!r.ok) return json({ error: `Shovels error ${r.status}`, details: await r.text() }, r.status);
      const u = await r.json();
      return json({ used: u.credits_used ?? null, limit: u.credit_limit ?? null,
        remaining: u.credit_limit != null ? u.credit_limit - (u.credits_used ?? 0) : null });
    }
    if (raw?.action === "discover_developments") {
      const out = await discoverDevelopments({ supabase, apiKey, userId: user.id, body: raw });
      return json(out.body, out.status);
    }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { states, focus, minUnits, days, maxResults, statuses } = parsed.data;

    // Credits before the search, so the result message can say what the search actually cost
    let creditsBefore: number | null = null;
    const u0 = await fetch(`${SHOVELS}/usage`, { headers: { "X-API-Key": apiKey } });
    if (u0.ok) {
      const j0 = await u0.json();
      if (j0.credit_limit != null) creditsBefore = j0.credit_limit - (j0.credits_used ?? 0);
    }


    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // Residential and mixed-use only. Shovels treats repeated property_type values in a single
    // request as an AND, so each property type needs its own query. A query that returns no
    // records costs no credits, and mixed-use permits are rare enough today that this is free.
    const PROPERTY_TYPES = ["residential", "mixed_use"];
    const perQuery = Math.max(1, Math.ceil(maxResults / (states.length * focus.length)));
    const found = new Map<string, any>();
    let creditsRemaining: string | null = null;

    for (const state of states) {
      for (const f of focus) {
        for (const pt of PROPERTY_TYPES) {
          if (found.size >= maxResults) break; // stop buying once the cap is full
          const p = new URLSearchParams({
            geo_id: state, permit_from: fmt(from), permit_to: fmt(to), size: String(Math.min(perQuery, 100)),
          });
          p.append("property_type", pt);
          p.set("permit_has_contractor", "true");
          if (f === "large_residential") p.set("property_min_unit_count", String(minUnits));
          if (f === "hvac") p.append("permit_tags", "hvac");
          if (f === "new_construction") p.append("permit_tags", "new_construction");
          if (f === "remodel" || f === "adu" || f === "addition") p.append("permit_tags", f);
          statuses?.forEach((s) => p.append("permit_status", s));

          const r = await fetch(`${SHOVELS}/permits/search?${p}`, { headers: { "X-API-Key": apiKey } });
          creditsRemaining = r.headers.get("x-credits-remaining") ?? creditsRemaining;
          if (!r.ok) {
            const details = await r.text();
            console.error(`Shovels search failed [${r.status}]: ${details}`);
            const msg = r.status === 402 ? "Your Shovels credits are used up for this month."
              : r.status === 401 ? "Shovels rejected the API key." : `Shovels error ${r.status}`;
            return json({ error: msg, details }, r.status);
          }
          const data = await r.json();
          for (const item of data.items ?? []) {
            if (!found.has(item.id)) found.set(item.id, { ...item, _focus: f, _property_type: pt });
            if (found.size >= maxResults) break;
          }
        }
      }
    }

    const permits = [...found.values()];
    const unitsFound = permits.reduce((s: number, p: any) => s + deriveUnits(p), 0);


    const res = await importPermits({ supabase, apiKey, userId: user.id, permits });
    const { fresh, imported, matched, created, greenLit, unitsImported, unitsListed } = res;
    if (res.creditsRemaining != null) creditsRemaining = String(res.creditsRemaining);

    await supabase.from("permit_scraping_logs").insert({
      data_source: "shovels",
      search_params: { states, focus, minUnits, days, maxResults, statuses, propertyTypes: PROPERTY_TYPES },
      permits_found: permits.length, permits_imported: imported, permits_matched: matched,
      new_companies_created: created, status: "success", created_by: user.id,
      completed_at: new Date().toISOString(),
    });

    return json({
      success: true, permitsFound: permits.length, alreadyHad: permits.length - fresh.length,
      permitsImported: imported, permitsMatched: matched, newCompaniesCreated: created, greenLightLeads: greenLit,
      unitsFound, unitsImported, unitsListedImported: unitsListed,
      creditsRemaining: creditsRemaining ? Number(creditsRemaining) : null,
      creditsUsed: creditsBefore != null && creditsRemaining ? creditsBefore - Number(creditsRemaining) : null,

    });
  } catch (e) {
    console.error("shovels-permit-search error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
