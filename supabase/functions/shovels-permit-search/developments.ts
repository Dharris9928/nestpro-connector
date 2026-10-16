// "Find Developments" mode — three stages that stop early to save Shovels credits.
//  Stage "scout":   free. Resolve areas to county/city IDs, read /meta/coverage (free) to rank
//                   by recent permit volume and drop weak-coverage areas; optionally read
//                   metrics/current (1 credit per area) for the top few only.
//  Stage "confirm": stage 2 detection (small bounded /permits/search per shortlisted area,
//                   grouped by contractor + jurisdiction) then stage 3 (contractor details +
//                   inserts) for the winning clusters only. Stops before exceeding creditBudget.
import { z } from "https://esm.sh/zod@3.23.8";
import { deriveUnits, importPermits, titleCase } from "./importPermits.ts";

const SHOVELS = "https://api.shovels.ai/v2";

// Shovels' county search caps at 15 results and can't list a state's counties, so we seed
// each state with its main homebuilding counties and add any saved metro cities on top.
const SEED_COUNTIES: Record<string, string[]> = {
  AL: ["Baldwin", "Madison", "Shelby", "Jefferson", "Limestone"], AK: ["Anchorage", "Matanuska-Susitna"],
  AZ: ["Maricopa", "Pinal", "Pima", "Yavapai", "Mohave"], AR: ["Benton", "Washington", "Pulaski", "Faulkner"],
  CA: ["Riverside", "San Bernardino", "Sacramento", "Kern", "Fresno", "Placer", "Los Angeles", "San Diego", "San Joaquin", "Orange"],
  CO: ["El Paso", "Weld", "Douglas", "Arapahoe", "Adams", "Larimer"], CT: ["Fairfield", "Hartford", "New Haven"],
  DE: ["Sussex", "New Castle", "Kent"], FL: ["Polk", "Lee", "Hillsborough", "St. Johns", "Osceola", "Pasco", "Lake", "Orange", "Manatee", "Collier"],
  GA: ["Gwinnett", "Forsyth", "Cherokee", "Henry", "Bryan", "Paulding", "Jackson"], HI: ["Honolulu", "Hawaii", "Maui"],
  ID: ["Ada", "Canyon", "Kootenai", "Bonneville"], IL: ["Will", "Kane", "Cook", "DuPage", "McHenry"],
  IN: ["Hamilton", "Hendricks", "Johnson", "Marion", "Allen"], IA: ["Polk", "Dallas", "Linn", "Johnson"],
  KS: ["Johnson", "Sedgwick", "Douglas"], KY: ["Jefferson", "Fayette", "Boone", "Warren"],
  LA: ["St. Tammany", "Livingston", "Ascension", "East Baton Rouge", "Lafayette"], ME: ["Cumberland", "York"],
  MD: ["Frederick", "Anne Arundel", "Prince George's", "Charles", "Howard"], MA: ["Middlesex", "Worcester", "Plymouth", "Essex"],
  MI: ["Oakland", "Kent", "Macomb", "Ottawa", "Washtenaw"], MN: ["Hennepin", "Wright", "Scott", "Dakota", "Anoka"],
  MS: ["DeSoto", "Madison", "Harrison", "Rankin"], MO: ["St. Charles", "Jackson", "Greene", "St. Louis", "Clay"],
  MT: ["Gallatin", "Yellowstone", "Flathead", "Missoula"], NE: ["Douglas", "Sarpy", "Lancaster"],
  NV: ["Clark", "Washoe", "Lyon"], NH: ["Hillsborough", "Rockingham", "Strafford"],
  NJ: ["Middlesex", "Monmouth", "Ocean", "Burlington", "Gloucester"], NM: ["Bernalillo", "Sandoval", "Dona Ana"],
  NY: ["Kings", "Queens", "Suffolk", "Saratoga", "Westchester", "Monroe"],
  NC: ["Wake", "Johnston", "Mecklenburg", "Union", "Cabarrus", "Brunswick", "Durham", "Guilford"],
  ND: ["Cass", "Burleigh"], OH: ["Delaware", "Franklin", "Warren", "Butler", "Union", "Licking"],
  OK: ["Oklahoma", "Tulsa", "Canadian", "Cleveland"], OR: ["Washington", "Deschutes", "Clackamas", "Multnomah", "Marion"],
  PA: ["Chester", "Montgomery", "Lancaster", "York", "Bucks", "Cumberland"], RI: ["Providence", "Kent", "Washington"],
  SC: ["Horry", "Berkeley", "York", "Greenville", "Lexington", "Spartanburg", "Charleston"], SD: ["Minnehaha", "Lincoln", "Pennington"],
  TN: ["Rutherford", "Williamson", "Wilson", "Sumner", "Davidson", "Montgomery", "Knox"],
  TX: ["Harris", "Collin", "Denton", "Fort Bend", "Williamson", "Montgomery", "Bexar", "Travis", "Tarrant", "Hays", "Dallas", "Kaufman", "Comal"],
  UT: ["Utah", "Salt Lake", "Washington", "Davis", "Weber"], VT: ["Chittenden"],
  VA: ["Loudoun", "Prince William", "Chesterfield", "Fairfax", "Stafford", "Henrico"],
  WA: ["King", "Pierce", "Snohomish", "Clark", "Spokane", "Thurston"], WV: ["Berkeley", "Monongalia", "Jefferson"],
  WI: ["Dane", "Waukesha", "Brown", "Milwaukee"], WY: ["Laramie", "Natrona"],
};

const Geo = z.object({ geoId: z.string().min(1).max(64), geoType: z.enum(["county", "city"]), name: z.string().max(200), state: z.string().max(4) });
const Scout = z.object({
  stage: z.literal("scout"),
  states: z.array(z.string().regex(/^[A-Z]{2}$/)).max(15).default([]),
  metroId: z.string().uuid().optional(),
  days: z.number().int().min(30).max(365).default(180),
  topN: z.number().int().min(1).max(15).default(6),
  useMetrics: z.boolean().default(true),
  creditBudget: z.number().int().min(1).max(500).default(100),
});
const Confirm = z.object({
  stage: z.literal("confirm"),
  geos: z.array(Geo).min(1).max(15),
  minUnits: z.number().int().min(2).max(2000).default(25),
  days: z.number().int().min(30).max(365).default(180),
  creditBudget: z.number().int().min(1).max(500).default(100),
  stage1Credits: z.number().int().min(0).max(500).default(0),
  maxClusters: z.number().int().min(1).max(20).default(5),
  minClusterPermits: z.number().int().min(2).max(100).default(3),
  allowFallback: z.boolean().default(true),
  area: z.string().max(200).optional(),
});

const fmt = (d: Date) => d.toISOString().slice(0, 10);

async function remaining(apiKey: string): Promise<number | null> {
  const r = await fetch(`${SHOVELS}/usage`, { headers: { "X-API-Key": apiKey } });
  if (!r.ok) return null;
  const u = await r.json();
  return u.credit_limit != null ? u.credit_limit - (u.credits_used ?? 0) : null;
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += n) out.push(...await Promise.all(items.slice(i, i + n).map(fn)));
  return out;
}

export async function discoverDevelopments({ supabase, apiKey, userId, body }: {
  supabase: any; apiKey: string; userId: string; body: any;
}): Promise<{ status: number; body: unknown }> {
  const H = { "X-API-Key": apiKey };
  const get = (path: string) => fetch(`${SHOVELS}${path}`, { headers: H });

  // ---------------- Stage 1: scouting ----------------
  if (body?.stage === "scout") {
    const parsed = Scout.safeParse(body);
    if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten().fieldErrors } };
    const { metroId, days, topN, useMetrics, creditBudget } = parsed.data;
    let states = parsed.data.states;

    const lookups: { q: string; type: "county" | "city"; state: string }[] = [];
    if (metroId) {
      const { data: m } = await supabase.from("metro_areas").select("state, primary_city, included_cities").eq("id", metroId).single();
      if (!m) return { status: 400, body: { error: "Metro area not found" } };
      const cities = [...new Set([m.primary_city, ...(m.included_cities ?? [])])].slice(0, 15);
      cities.forEach((c: string) => lookups.push({ q: c, type: "city", state: m.state }));
    }
    if (!states.length && !metroId) return { status: 400, body: { error: "Pick a region, metro or state" } };
    states = states.slice(0, 15);
    for (const s of states) (SEED_COUNTIES[s] ?? []).forEach((c) => lookups.push({ q: c, type: "county", state: s }));
    if (states.length) {
      const { data: metros } = await supabase.from("metro_areas").select("state, primary_city").eq("is_active", true).in("state", states);
      (metros ?? []).forEach((m: any) => lookups.push({ q: m.primary_city, type: "city", state: m.state }));
    }

    // Resolve names to Shovels geo IDs (free)
    const resolved = (await pool(lookups.slice(0, 120), 10, async (l) => {
      const r = await get(`/${l.type === "county" ? "counties" : "cities"}/search?q=${encodeURIComponent(l.q)}`);
      if (!r.ok) return null;
      const items = (await r.json()).items ?? [];
      const want = l.q.toLowerCase();
      const hit = items.find((i: any) => i.state === l.state && String(i.name).toLowerCase().startsWith(want));
      return hit ? { geoId: hit.geo_id, geoType: l.type, name: hit.name, state: l.state } : null;
    })).filter(Boolean) as z.infer<typeof Geo>[];
    const uniq = [...new Map(resolved.map((g) => [g.geoId, g])).values()];

    // Coverage (free): recent permit volume + how often permits name a contractor
    const to = new Date(), from = new Date(Date.now() - days * 86400000);
    const scored = (await pool(uniq, 10, async (g) => {
      const r = await get(`/meta/coverage?geo_type=${g.geoType}&geo_id=${encodeURIComponent(g.geoId)}&date_from=${fmt(from)}&date_to=${fmt(to)}`);
      if (!r.ok) return { ...g, permitsTotal: 0, contractorFill: 0, unitFill: 0, weak: true };
      const items = (await r.json()).items ?? [];
      const f = (field: string) => items.find((i: any) => i.field === field);
      const permitsTotal = items[0]?.permits_total ?? 0;
      const contractorFill = f("contractor_id")?.fill_pct ?? 0;
      const unitFill = f("property_unit_count")?.fill_pct ?? 0;
      return { ...g, permitsTotal, contractorFill, unitFill, weak: permitsTotal < 100 || contractorFill < 0.15 };
    })) as any[];

    const strong = scored.filter((g) => !g.weak).sort((a, b) => b.permitsTotal * b.contractorFill - a.permitsTotal * a.contractorFill);
    let shortlist = strong.slice(0, topN);

    // Optional metrics: residential new-construction activity, 1 credit per area, top areas only
    let creditsUsed = 0;
    if (useMetrics && shortlist.length) {
      const before = await remaining(apiKey);
      const cap = Math.min(shortlist.length, Math.max(0, Math.floor(creditBudget / 10)));
      const withMetrics = await pool(shortlist.slice(0, cap), 5, async (g: any) => {
        const r = await get(`/${g.geoType === "county" ? "counties" : "cities"}/${encodeURIComponent(g.geoId)}/metrics/current?property_type=residential&tag=new_construction&size=1`);
        if (!r.ok) return g;
        const m = (await r.json()).items?.[0];
        return m ? { ...g, ncActive: m.permit_active_count ?? 0, ncInReview: m.permit_in_review_count ?? 0, ncContractors: m.contractor_count ?? 0 } : g;
      });
      shortlist = [...withMetrics, ...shortlist.slice(cap)];
      shortlist.sort((a: any, b: any) => ((b.ncActive ?? -1) + (b.ncInReview ?? 0)) - ((a.ncActive ?? -1) + (a.ncInReview ?? 0)));
      const after = await remaining(apiKey);
      if (before != null && after != null) creditsUsed = Math.max(0, before - after);
    }

    return { status: 200, body: {
      stage: "scout", shortlist, skippedWeak: scored.filter((g) => g.weak).map((g) => g.name),
      checked: scored.length, creditsUsed, creditsRemaining: await remaining(apiKey),
    } };
  }

  // ---------------- Stages 2 + 3 ----------------
  const parsed = Confirm.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: parsed.error.flatten().fieldErrors } };
  const { geos, minUnits, days, creditBudget, stage1Credits, maxClusters, minClusterPermits, allowFallback, area } = parsed.data;

  const start = await remaining(apiKey);
  if (start == null) return { status: 502, body: { error: "Couldn't read Shovels credits" } };
  const budget = Math.min(creditBudget - stage1Credits, start);
  let left = start;                         // tracked from x-credits-remaining
  const spent = () => start - left;
  const reserve = Math.min(maxClusters, Math.floor(budget / 4)); // keep some for stage 3 contractors
  let stopped: string | null = null;

  const to = new Date(), from = new Date(Date.now() - days * 86400000);
  const bought: any[] = [];
  const perGeo: any[] = [];

  for (const g of geos) {
    const room = budget - reserve - spent();
    if (room < 1) { stopped = "Credit budget reached during detection"; break; }
    const size = Math.min(25, room);
    const run = async (withUnits: boolean) => {
      const p = new URLSearchParams({ geo_id: g.geoId, permit_from: fmt(from), permit_to: fmt(to), size: String(size), include_count: "true" });
      p.append("property_type", "residential");
      p.append("permit_tags", "new_construction");
      p.set("permit_has_contractor", "true");
      if (withUnits) p.set("property_min_unit_count", String(minUnits));
      const r = await fetch(`${SHOVELS}/permits/search?${p}`, { headers: H });
      const hdr = r.headers.get("x-credits-remaining");
      if (hdr != null) left = Number(hdr);
      if (!r.ok) throw new Error(r.status === 402 ? "Your Shovels credits are used up for this month." : `Shovels error ${r.status}`);
      return await r.json();
    };
    try {
      let mode = "min_units";
      let data = await run(true);             // zero results cost nothing
      if (!(data.items?.length) && allowFallback) { mode = "builder_cluster"; data = await run(false); }
      const items = data.items ?? [];
      items.forEach((i: any) => bought.push({ ...i, _geo: g }));
      perGeo.push({ name: g.name, mode, returned: items.length, total: data.total_count?.value ?? null });
    } catch (e) {
      stopped = e instanceof Error ? e.message : "Shovels error";
      break;
    }
  }
  const stage2Credits = spent();

  // Group by contractor + jurisdiction
  const groups = new Map<string, any>();
  for (const p of bought) {
    if (!p.contractor_id) continue;
    const juris = p.jurisdiction || p.address?.city || p._geo.name;
    const key = `${p.contractor_id}|${juris}`;
    const g = groups.get(key) ?? { key, contractorId: p.contractor_id, jurisdiction: titleCase(juris), state: p.address?.state ?? p._geo.state, area: p._geo.name, permits: [], units: 0, value: 0, first: null, last: null };
    g.permits.push(p);
    g.units += deriveUnits(p);
    g.value += (p.job_value ?? 0) / 100;
    const d = p.file_date ?? p.issue_date;
    if (d) { if (!g.first || d < g.first) g.first = d; if (!g.last || d > g.last) g.last = d; }
    groups.set(key, g);
  }
  const ranked = [...groups.values()]
    .map((g) => ({ ...g, score: g.permits.length * 2 + g.units }))
    .filter((g) => g.permits.length >= minClusterPermits || g.units >= minUnits)
    .sort((a, b) => b.score - a.score);
  const winners = ranked.slice(0, maxClusters);

  // Stage 3: only the winners get contractor details + inserts
  const before3 = left;
  let importRes: any = { imported: 0, matched: 0, created: 0, greenLit: 0, unitsImported: 0, fresh: [] };
  if (winners.length) {
    const room = Math.max(0, budget - spent());
    importRes = await importPermits({
      supabase, apiKey, userId, permits: winners.flatMap((w) => w.permits),
      projectTypeOverride: "multi_family", maxNewContractors: room,
    });
    if (importRes.creditsRemaining != null) left = importRes.creditsRemaining;
    if (room === 0) stopped = stopped ?? "No budget left for new contractor details — imported with stored details only";
  }
  const stage3Credits = Math.max(0, before3 - left);

  // Names for the result list (from the stored/bought contractor details)
  const ids = winners.map((w) => w.contractorId);
  const names = new Map<string, string>();
  if (ids.length) {
    const { data } = await supabase.from("building_permits").select("builder_name, raw_data->contractor->>id").in("raw_data->contractor->>id", ids).limit(200);
    (data ?? []).forEach((r: any) => r.builder_name && names.set(r.id, r.builder_name));
  }
  const clusters = winners.map((w) => ({
    builder: names.get(w.contractorId) ?? null, contractorId: w.contractorId, jurisdiction: w.jurisdiction, state: w.state,
    area: w.area, permits: w.permits.length, units: w.units, value: w.value, firstFiled: w.first, lastFiled: w.last,
  }));

  await supabase.from("permit_scraping_logs").insert({
    data_source: "shovels",
    search_params: {
      mode: "discover_developments", area, geos: geos.map((g) => g.name), minUnits, days, creditBudget, maxClusters,
      credits: { stage1: stage1Credits, stage2: stage2Credits, stage3: stage3Credits, total: stage1Credits + stage2Credits + stage3Credits },
      perGeo, clustersFound: ranked.length, stopped,
    },
    permits_found: bought.length, permits_imported: importRes.imported, permits_matched: importRes.matched,
    new_companies_created: importRes.created, status: stopped ? "partial" : "success", created_by: userId,
    completed_at: new Date().toISOString(),
  });

  return { status: 200, body: {
    stage: "confirm", partial: !!stopped, stoppedReason: stopped, perGeo,
    permitsScanned: bought.length, clustersFound: ranked.length, clusters,
    permitsImported: importRes.imported, permitsMatched: importRes.matched, newCompaniesCreated: importRes.created,
    greenLightLeads: importRes.greenLit, unitsImported: importRes.unitsImported,
    credits: { stage1: stage1Credits, stage2: stage2Credits, stage3: stage3Credits, total: stage1Credits + stage2Credits + stage3Credits },
    creditsRemaining: left,
  } };
}
