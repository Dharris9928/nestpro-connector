// Shovels only fills property_unit_count on multi-family filings — on a single-family,
// duplex or ADU permit the filing itself is the home, so we count it that way instead of
// showing nothing. Anything we work out ourselves is flagged as estimated.
export interface UnitSource {
  num_units?: number | null;
  property_type?: string | null;
  permit_type?: string | null;
  project_name?: string | null;
  project_description?: string | null;
  raw_data?: any;
}

export interface PermitUnits {
  units: number;
  estimated: boolean;
}

const COUNT_RE = /(\d[\d,]*)\s*(?:units?|homes?|doors?|townhomes?|apartments?|residences?)\b/;
const TWO_RE = /\bduplex\b|\btwo[\s-]?plex\b/;
const ONE_RE =
  /single[\s_-]?family|\bsfd\b|\bsfr\b|\badu\b|accessory dwelling|town\s?home|townhouse|dwelling|single[\s_-]?unit|one[\s-]family/;

export const getPermitUnits = (p: UnitSource): PermitUnits => {
  const listed = p.num_units ?? 0;
  if (listed > 0) return { units: listed, estimated: false };

  const detail = String(p.raw_data?.permit?.property_type_detail ?? p.property_type ?? "").toLowerCase();
  const text = `${p.project_name ?? ""} ${p.project_description ?? ""} ${p.permit_type ?? ""}`.toLowerCase();

  const m = text.match(COUNT_RE);
  if (m) return { units: parseInt(m[1].replace(/,/g, ""), 10) || 0, estimated: true };
  if (TWO_RE.test(text)) return { units: 2, estimated: true };
  if (ONE_RE.test(`${detail} ${text}`)) return { units: 1, estimated: true };
  return { units: 0, estimated: false };
};

export const summarizePermitUnits = (permits: UnitSource[]) => {
  let units = 0;
  let listed = 0;
  let estimated = 0;
  let unknown = 0;
  permits.forEach((p) => {
    const r = getPermitUnits(p);
    units += r.units;
    if (r.estimated) estimated++;
    else if (r.units > 0) listed++;
    else unknown++;
  });
  return { units, listed, estimated, unknown, hasEstimates: estimated > 0 };
};
