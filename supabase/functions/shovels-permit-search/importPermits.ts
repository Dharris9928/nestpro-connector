const REGION_MAP: Record<string, string[]> = {
  Southwest: ["AZ", "NM", "NV"], Southeast: ["FL", "GA", "AL", "SC", "NC", "TN", "MS", "LA"],
  Texas: ["TX"], California: ["CA"], "Pacific Northwest": ["WA", "OR", "ID"],
  Northeast: ["NY", "NJ", "PA", "MA", "CT", "RI", "VT", "NH", "ME"],
  Midwest: ["IL", "IN", "MI", "OH", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"],
  "Mountain West": ["CO", "WY", "MT", "UT"],
};
export const regionFor = (s: string) => Object.entries(REGION_MAP).find(([, l]) => l.includes(s))?.[0] ?? null;
export const titleCase = (s?: string | null) => s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s;

// Shovels only fills property_unit_count on multi-family filings. On a single-family, duplex
// or ADU permit the filing itself is the home, so count it that way instead of showing nothing.
const COUNT_RE = /(\d[\d,]*)\s*(?:units?|homes?|doors?|townhomes?|apartments?|residences?)\b/;
const TWO_RE = /\bduplex\b|\btwo[\s-]?plex\b/;
const ONE_RE =
  /single[\s_-]?family|\bsfd\b|\bsfr\b|\badu\b|accessory dwelling|town\s?home|townhouse|dwelling|single[\s_-]?unit|one[\s-]family/;
export const deriveUnits = (p: any): number => {
  const listed = p.property_unit_count ?? 0;
  if (listed > 0) return listed;
  const detail = String(p.property_type_detail ?? "").toLowerCase();
  const text = `${p.description ?? ""} ${p.description_derived ?? ""} ${p.subtype ?? ""}`.toLowerCase();
  const m = text.match(COUNT_RE);
  if (m) return parseInt(m[1].replace(/,/g, ""), 10) || 0;
  if (TWO_RE.test(text)) return 2;
  if (ONE_RE.test(`${detail} ${text}`)) return 1;
  return 0;
};



// Shared by the regular permit search and the "Find Developments" mode: skips permits we
// already have, reuses stored contractor details (free), buys only missing contractors, then
// writes companies + building_permits so the green-light trigger and alerts fire as usual.
export async function importPermits({ supabase, apiKey, userId, permits, projectTypeOverride, maxNewContractors }: {
  supabase: any; apiKey: string; userId: string; permits: any[];
  projectTypeOverride?: string; maxNewContractors?: number;
}) {
  const SHOVELS = "https://api.shovels.ai/v2";
  let creditsRemaining: string | null = null;
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
  const contractorIds = allIds.filter((id) => !contractors.has(id)).slice(0, maxNewContractors ?? Infinity);
  let contractorCreditsUsed = 0;
  for (let i = 0; i < contractorIds.length; i += 50) {
    const q = new URLSearchParams();
    contractorIds.slice(i, i + 50).forEach((id) => q.append("id", id));
    const r = await fetch(`${SHOVELS}/contractors?${q}`, { headers: { "X-API-Key": apiKey } });
    creditsRemaining = r.headers.get("x-credits-remaining") ?? creditsRemaining;
    if (r.ok) (await r.json()).items?.forEach((c: any) => { contractors.set(c.id, c); contractorCreditsUsed++; });
    else console.error(`Shovels contractors failed [${r.status}]: ${await r.text()}`);
  }

  let matched = 0, created = 0, imported = 0, greenLit = 0, unitsImported = 0, unitsListed = 0;
  for (const p of fresh) {
    const c = p.contractor_id ? contractors.get(p.contractor_id) : null;
    const contractorName = titleCase(c?.business_name || c?.name || null);
    const addr = p.address ?? {};
    const units = p.property_unit_count ?? null;
    const value = p.job_value != null ? p.job_value / 100 : null;
    const projectType = projectTypeOverride ?? (((p._property_type ?? p.property_type) === "mixed_use" ? "mixed_use"
      : p._focus === "large_residential" ? "multi_family"
      : p._focus === "new_construction" ? "new_construction"
      : p._focus === "remodel" || p._focus === "adu" || p._focus === "addition" ? p._focus : "hvac"));

    let companyId: string | null = null, confidence: number | null = null, wasNew = false;
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
          created_by: userId,
        }).select("id").single();
        if (ce) console.error("Company insert failed:", ce.message);
        if (nc) { companyId = nc.id; created++; wasNew = true; }
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
      contractor_was_new: wasNew,
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
      created_by: userId,
    }).select("id, green_light").single();
    if (ie) { console.error("Permit insert failed:", ie.message); continue; }
    imported++;
    unitsImported += deriveUnits(p);
    unitsListed += units ?? 0;

    if (ins?.green_light) greenLit++;

    if (isHighValue && ins) {
      await supabase.from("permit_alerts").insert({
        permit_id: ins.id, alert_type: (units ?? 0) >= 200 ? "large_development" : "high_value", priority: "high",
        message: `${units ?? ""}${units ? "-unit " : ""}project in ${titleCase(addr.city)}, ${addr.state}`,
      });
    }
  }


  return { fresh, imported, matched, created, greenLit, unitsImported, unitsListed, contractorCreditsUsed,
    creditsRemaining: creditsRemaining != null ? Number(creditsRemaining) : null };
}
