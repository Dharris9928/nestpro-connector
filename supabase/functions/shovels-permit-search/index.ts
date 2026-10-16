import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { getCorsHeaders } from "../_shared/cors.ts";

const SHOVELS = "https://api.shovels.ai/v2";

const Body = z.object({
  states: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(15),
  focus: z.array(z.enum(["large_residential", "hvac", "new_construction"])).min(1),
  minUnits: z.number().int().min(2).max(2000).default(50),
  days: z.number().int().min(1).max(365).default(30),
  maxResults: z.number().int().min(1).max(200).default(25),
  statuses: z.array(z.enum(["active", "in_review", "final", "inactive"])).optional(),
});

const REGION_MAP: Record<string, string[]> = {
  Southwest: ["AZ", "NM", "NV"], Southeast: ["FL", "GA", "AL", "SC", "NC", "TN", "MS", "LA"],
  Texas: ["TX"], California: ["CA"], "Pacific Northwest": ["WA", "OR", "ID"],
  Northeast: ["NY", "NJ", "PA", "MA", "CT", "RI", "VT", "NH", "ME"],
  Midwest: ["IL", "IN", "MI", "OH", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"],
  "Mountain West": ["CO", "WY", "MT", "UT"],
};
const regionFor = (s: string) => Object.entries(REGION_MAP).find(([, l]) => l.includes(s))?.[0] ?? null;
const titleCase = (s?: string | null) => s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;

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
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { states, focus, minUnits, days, maxResults, statuses } = parsed.data;

    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // One Shovels query per (state, focus). Each record returned costs 1 credit.
    const perQuery = Math.max(1, Math.ceil(maxResults / (states.length * focus.length)));
    const found = new Map<string, any>();
    let creditsRemaining: string | null = null;

    for (const state of states) {
      for (const f of focus) {
        const p = new URLSearchParams({
          geo_id: state, permit_from: fmt(from), permit_to: fmt(to), size: String(Math.min(perQuery, 100)),
        });
        p.append("property_type", "residential");
        p.set("permit_has_contractor", "true");
        if (f === "large_residential") p.set("property_min_unit_count", String(minUnits));
        if (f === "hvac") p.append("permit_tags", "hvac");
        if (f === "new_construction") p.append("permit_tags", "new_construction");
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
          if (!found.has(item.id)) found.set(item.id, { ...item, _focus: f });
          if (found.size >= maxResults) break;
        }
      }
    }

    const permits = [...found.values()];

    // Skip permits we already have
    const { data: existing } = await supabase.from("building_permits").select("external_id")
      .in("external_id", permits.map((p) => p.id));
    const have = new Set((existing ?? []).map((e: any) => e.external_id));
    const fresh = permits.filter((p) => !have.has(p.id));

    // Contractor details: reuse ones we already pulled (free), only buy the rest
    const allIds = [...new Set(fresh.map((p) => p.contractor_id).filter(Boolean))] as string[];
    const contractors = new Map<string, any>();
    if (allIds.length) {
      const { data: known } = await supabase.from("building_permits").select("raw_data")
        .in("raw_data->contractor->>id", allIds).limit(500);
      (known ?? []).forEach((k: any) => k.raw_data?.contractor && contractors.set(k.raw_data.contractor.id, k.raw_data.contractor));
    }
    const contractorIds = allIds.filter((id) => !contractors.has(id));
    let contractorCreditsUsed = 0;
    for (let i = 0; i < contractorIds.length; i += 50) {
      const q = new URLSearchParams();
      contractorIds.slice(i, i + 50).forEach((id) => q.append("id", id));
      const r = await fetch(`${SHOVELS}/contractors?${q}`, { headers: { "X-API-Key": apiKey } });
      creditsRemaining = r.headers.get("x-credits-remaining") ?? creditsRemaining;
      if (r.ok) (await r.json()).items?.forEach((c: any) => { contractors.set(c.id, c); contractorCreditsUsed++; });
      else console.error(`Shovels contractors failed [${r.status}]: ${await r.text()}`);
    }

    let matched = 0, created = 0, imported = 0;
    for (const p of fresh) {
      const c = p.contractor_id ? contractors.get(p.contractor_id) : null;
      const contractorName = titleCase(c?.business_name || c?.name || null);
      const addr = p.address ?? {};
      const units = p.property_unit_count ?? null;
      const value = p.job_value != null ? p.job_value / 100 : null;
      const projectType = p._focus === "large_residential" ? "multi_family"
        : p._focus === "new_construction" ? "new_construction" : "hvac";

      let companyId: string | null = null, confidence: number | null = null;
      if (contractorName) {
        const { data: m } = await supabase.from("companies").select("id, tags")
          .ilike("company_name", contractorName).limit(1);
        if (m?.length) {
          companyId = m[0].id; confidence = 95; matched++;
          const tags: string[] = m[0].tags ?? [];
          if (!tags.includes("Shovels")) await supabase.from("companies").update({ tags: [...tags, "Shovels"] }).eq("id", companyId);
        } else {
          const isBuilder = projectType !== "hvac";
          const { data: nc, error: ce } = await supabase.from("companies").insert({
            company_name: contractorName,
            industry_type: isBuilder ? "Builder" : "Contractor",
            segment: isBuilder ? (projectType === "multi_family" ? "multi_family" : "production_tract") : null,
            status: "Lead",
            city: titleCase(c?.address?.city ?? addr.city), state: c?.address?.state ?? addr.state,
            zip: c?.address?.zip_code ?? addr.zip_code,
            primary_phone: c?.primary_phone || c?.phone || null,
            primary_email: c?.primary_email || c?.email || null,
            website_url: c?.website || null,
            linkedin_company_url: c?.linkedin_url || null,
            tags: ["Shovels"],
            notes: `Added from Shovels permit ${p.number ?? p.id}${c?.license ? ` · License ${c.license}` : ""}${c?.permit_count ? ` · ${c.permit_count} permits on record` : ""}`,
            created_by: user.id,
          }).select("id").single();
          if (ce) console.error("Company insert failed:", ce.message);
          if (nc) { companyId = nc.id; created++; }
        }
      }

      const isHighValue = (units ?? 0) >= 200 || (value ?? 0) >= 50_000_000;
      const street = [addr.street_no, titleCase(addr.street)].filter(Boolean).join(" ");
      const { data: ins, error: ie } = await supabase.from("building_permits").insert({
        external_id: p.id,
        permit_number: p.number,
        project_name: p.description_derived || p.description || p.type || "Permit",
        project_description: p.description,
        num_units: units,
        estimated_value: value,
        builder_name: contractorName,
        builder_company_id: companyId,
        is_matched_to_company: !!companyId,
        match_confidence: confidence,
        address_line1: street || null,
        city: titleCase(addr.city), state: addr.state, zip: addr.zip_code, county: titleCase(addr.county),
        filed_date: p.file_date, issued_date: p.issue_date,
        status: p.status,
        applicant_phone: c?.primary_phone || c?.phone || null,
        applicant_email: c?.primary_email || c?.email || null,
        project_type: projectType,
        permit_type: [p.type, p.subtype].filter(Boolean).join(" – ") || null,
        permit_tags: p.tags ?? [],
        property_type: p.property_type_detail || p.property_type,
        jurisdiction: p.jurisdiction,
        contractor_license: c?.license ?? null,
        contractor_website: c?.website ?? null,
        region: regionFor(addr.state),
        data_source: "shovels",
        is_high_value: isHighValue,
        raw_data: { permit: p, contractor: c ?? null },
        scraped_at: new Date().toISOString(),
        created_by: user.id,
      }).select("id").single();
      if (ie) { console.error("Permit insert failed:", ie.message); continue; }
      imported++;

      if (isHighValue && ins) {
        await supabase.from("permit_alerts").insert({
          permit_id: ins.id, alert_type: (units ?? 0) >= 200 ? "large_development" : "high_value", priority: "high",
          message: `${units ?? ""}${units ? "-unit " : ""}project in ${titleCase(addr.city)}, ${addr.state}`,
        });
      }
    }

    await supabase.from("permit_scraping_logs").insert({
      data_source: "shovels",
      search_params: { states, focus, minUnits, days, maxResults, statuses },
      permits_found: permits.length, permits_imported: imported, permits_matched: matched,
      new_companies_created: created, status: "success", created_by: user.id,
      completed_at: new Date().toISOString(),
    });

    return json({
      success: true, permitsFound: permits.length, alreadyHad: permits.length - fresh.length,
      permitsImported: imported, permitsMatched: matched, newCompaniesCreated: created,
      creditsRemaining: creditsRemaining ? Number(creditsRemaining) : null,
    });
  } catch (e) {
    console.error("shovels-permit-search error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
