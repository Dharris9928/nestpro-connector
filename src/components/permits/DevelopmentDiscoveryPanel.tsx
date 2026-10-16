import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Loader2, Radar } from "lucide-react";

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

type Geo = {
  geoId: string; geoType: "county" | "city"; name: string; state: string;
  permitsTotal: number; contractorFill: number; ncActive?: number; ncInReview?: number;
};
type Scout = { shortlist: Geo[]; skippedWeak: string[]; checked: number; creditsUsed: number; creditsRemaining: number | null };
type Result = {
  partial: boolean; stoppedReason: string | null; permitsScanned: number; clustersFound: number;
  clusters: { builder: string | null; jurisdiction: string; state: string; permits: number; units: number; firstFiled: string | null; lastFiled: string | null }[];
  permitsImported: number; newCompaniesCreated: number; greenLightLeads: number;
  credits: { stage1: number; stage2: number; stage3: number; total: number }; creditsRemaining: number | null;
};

const invoke = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("shovels-permit-search", { body: { action: "discover_developments", ...body } });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ } }
    throw new Error(typeof msg === "string" ? msg : "Request failed");
  }
  return data;
};

export const DevelopmentDiscoveryPanel = ({ remaining, onDone, onCancel }: {
  remaining: number | null; onDone: () => void; onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [areaType, setAreaType] = useState<"region" | "metro" | "state">("region");
  const [areaValue, setAreaValue] = useState("none");
  const [minUnits, setMinUnits] = useState(25);
  const [creditBudget, setCreditBudget] = useState(50);
  const [scout, setScout] = useState<Scout | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<"scout" | "confirm" | null>(null);

  const { data: regions } = useQuery({
    queryKey: ["permit-regions"],
    queryFn: async () => (await supabase.from("permit_regions").select("*").eq("is_active", true).order("region_name")).data ?? [],
  });
  const { data: metros } = useQuery({
    queryKey: ["metro-areas"],
    queryFn: async () => (await supabase.from("metro_areas").select("id, metro_name, state").eq("is_active", true).order("metro_name")).data ?? [],
  });

  const areaLabel = areaType === "metro" ? metros?.find((m) => m.id === areaValue)?.metro_name : areaValue;
  const budget = Math.min(creditBudget, remaining ?? creditBudget);

  const runScout = async () => {
    if (areaValue === "none") return toast({ title: "Pick an area first", variant: "destructive" });
    const body: Record<string, unknown> = { stage: "scout", creditBudget: budget, topN: 6 };
    if (areaType === "metro") body.metroId = areaValue;
    else body.states = areaType === "state" ? [areaValue] : regions?.find((r) => r.region_name === areaValue)?.states ?? [];
    setBusy("scout"); setResult(null);
    try {
      const s = (await invoke(body)) as Scout;
      setScout(s);
      setPicked(s.shortlist.slice(0, 3).map((g) => g.geoId));
    } catch (e: any) {
      toast({ title: "Scouting failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const runConfirm = async () => {
    if (!scout || !picked.length) return;
    setBusy("confirm");
    try {
      const geos = scout.shortlist.filter((g) => picked.includes(g.geoId)).map(({ geoId, geoType, name, state }) => ({ geoId, geoType, name, state }));
      const r = (await invoke({ stage: "confirm", geos, minUnits, creditBudget: budget, stage1Credits: scout.creditsUsed, area: areaLabel })) as Result;
      setResult(r);
      toast({ title: "Developments search complete", description: `${r.clustersFound} development(s) found, ${r.permitsImported} permits added. Used ${r.credits.total} credits.` });
      onDone();
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  // ---- Result view ----
  if (result) {
    return (
      <div className="space-y-4">
        <CreditRow credits={result.credits} remaining={result.creditsRemaining} />
        {result.partial && <p className="text-sm text-warning">Stopped early: {result.stoppedReason}</p>}
        <p className="text-sm text-muted-foreground">
          Checked {result.permitsScanned} new-construction permits · {result.clustersFound} builder cluster(s) · {result.permitsImported} permits added ·{" "}
          {result.newCompaniesCreated} new leads{result.greenLightLeads ? ` · ${result.greenLightLeads} green-light` : ""}
        </p>
        {result.clusters.length ? (
          <div className="rounded-md border divide-y">
            {result.clusters.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <div className="font-medium flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{c.builder ?? "Unknown builder"}</div>
                  <div className="text-xs text-muted-foreground">{c.jurisdiction}, {c.state} · filed {c.firstFiled ?? "?"}{c.lastFiled && c.lastFiled !== c.firstFiled ? ` – ${c.lastFiled}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{c.permits} permits</div>
                  <div className="text-xs text-muted-foreground">≈{c.units} homes</div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm">No builder had enough permits in one place to count as a development. Try another area.</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setResult(null); setScout(null); }}>New search</Button>
          <Button onClick={onCancel}>Close</Button>
        </div>
      </div>
    );
  }

  // ---- Shortlist / confirm view ----
  if (scout) {
    return (
      <div className="space-y-4">
        <button className="text-xs text-muted-foreground flex items-center gap-1 hover:underline" onClick={() => setScout(null)}>
          <ArrowLeft className="h-3 w-3" /> Change area
        </button>
        <div>
          <p className="text-sm font-medium">Busiest areas in {areaLabel}</p>
          <p className="text-xs text-muted-foreground">
            Ranked by new-home permit activity. Scouting cost {scout.creditsUsed} credit{scout.creditsUsed === 1 ? "" : "s"}.
            {scout.skippedWeak.length ? ` Skipped for thin data: ${scout.skippedWeak.join(", ")}.` : ""}
          </p>
        </div>
        {scout.shortlist.length ? (
          <div className="rounded-md border divide-y">
            {scout.shortlist.map((g) => (
              <label key={g.geoId} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                <Checkbox checked={picked.includes(g.geoId)}
                  onCheckedChange={(v) => setPicked(v ? [...picked, g.geoId] : picked.filter((x) => x !== g.geoId))} />
                <div className="flex-1">
                  <div className="font-medium">{g.name} <Badge variant="outline" className="ml-1 text-[10px]">{g.geoType}</Badge></div>
                  <div className="text-xs text-muted-foreground">
                    {g.permitsTotal.toLocaleString()} permits recently · builder named on {Math.round(g.contractorFill * 100)}%
                    {g.ncActive != null ? ` · ${(g.ncActive + (g.ncInReview ?? 0)).toLocaleString()} new homes active or in review` : ""}
                  </div>
                </div>
              </label>
            ))}
          </div>
        ) : <p className="text-sm">No areas with good enough data here. Try another area.</p>}
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Up to <span className="font-semibold">{Math.max(0, budget - scout.creditsUsed)}</span> more credits will be used across {picked.length} area(s)
          — it stops before going over and keeps what it found.
          {remaining != null && <> Credits left this month: <span className="font-semibold">{remaining}</span>.</>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={!!busy}>Cancel</Button>
          <Button onClick={runConfirm} disabled={!!busy || !picked.length || budget - scout.creditsUsed < 2}>
            {busy === "confirm" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
            {busy === "confirm" ? "Finding developments..." : "Confirm & find developments"}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Setup view ----
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Finds builders putting up many homes in one place. Step 1 ranks the busiest areas almost for free; you then choose which to spend credits on.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-2">
          <Label>Area type</Label>
          <Select value={areaType} onValueChange={(v) => { setAreaType(v as typeof areaType); setAreaValue("none"); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="region">Region</SelectItem>
              <SelectItem value="metro">Metro</SelectItem>
              <SelectItem value="state">State</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Area</Label>
          <Select value={areaValue} onValueChange={setAreaValue}>
            <SelectTrigger><SelectValue placeholder="Pick..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>Pick...</SelectItem>
              {areaType === "region" && regions?.map((r) => <SelectItem key={r.id} value={r.region_name}>{r.region_name}</SelectItem>)}
              {areaType === "metro" && metros?.map((m) => <SelectItem key={m.id} value={m.id}>{m.metro_name}</SelectItem>)}
              {areaType === "state" && US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Minimum units for big single buildings: {minUnits}</Label>
        <Slider value={[minUnits]} onValueChange={([v]) => setMinUnits(v)} min={5} max={300} step={5} />
        <p className="text-xs text-muted-foreground">Most areas don't list unit counts, so it also looks for one builder filing many new homes nearby.</p>
      </div>
      <div className="space-y-2">
        <Label>Credit budget: {creditBudget}</Label>
        <Slider value={[creditBudget]} onValueChange={([v]) => setCreditBudget(v)} min={10} max={200} step={10} />
        <p className="text-xs text-muted-foreground">
          The most this whole search can use.{remaining != null ? ` You have ${remaining} credits left this month.` : ""}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={!!busy}>Cancel</Button>
        <Button onClick={runScout} disabled={!!busy || areaValue === "none"}>
          {busy === "scout" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
          {busy === "scout" ? "Scouting..." : "Scout areas"}
        </Button>
      </div>
    </div>
  );
};

const CreditRow = ({ credits, remaining }: { credits: Result["credits"]; remaining: number | null }) => (
  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm grid grid-cols-4 gap-2">
    <div><div className="text-xs text-muted-foreground">Scouting</div><div className="font-semibold">{credits.stage1}</div></div>
    <div><div className="text-xs text-muted-foreground">Detection</div><div className="font-semibold">{credits.stage2}</div></div>
    <div><div className="text-xs text-muted-foreground">Confirm</div><div className="font-semibold">{credits.stage3}</div></div>
    <div><div className="text-xs text-muted-foreground">Credits left</div><div className="font-semibold">{remaining ?? "—"}</div></div>
  </div>
);
