import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Loader2, Search, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchComplete: () => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const FOCUS = [
  { id: "new_construction", label: "Residential new construction (RNC)", hint: "New builds — searched by default" },
  { id: "large_residential", label: "Large residential", hint: "Multi-family / big developments" },
  { id: "hvac", label: "HVAC / thermostat", hint: "Permits tagged HVAC" },
  { id: "remodel", label: "Remodel", hint: "Renovations of existing homes" },
  { id: "adu", label: "ADU", hint: "Accessory dwelling units (backyard homes, garage conversions)" },
  { id: "addition", label: "Addition", hint: "Square footage added to an existing home" },
] as const;

export const PermitGeographicSearchDialog = ({ open, onOpenChange, onSearchComplete }: Props) => {
  const [states, setStates] = useState<string[]>([]);
  const [focus, setFocus] = useState<string[]>(["new_construction"]);
  const [minUnits, setMinUnits] = useState(50);
  const [days, setDays] = useState("90");
  const [maxResults, setMaxResults] = useState(10);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const { data: regions } = useQuery({
    queryKey: ['permit-regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('permit_regions').select('*').eq('is_active', true).order('region_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: reps } = useQuery({
    queryKey: ['sales-reps-territories'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_reps').select('first_name, covered_states').eq('active', true);
      if (error) throw error;
      return data;
    }
  });

  // Map state -> rep firm names covering it; states with no active rep are "Grey states"
  const coveredByState = useMemo(() => {
    const map = new Map<string, string[]>();
    reps?.forEach((r) => (r.covered_states ?? []).forEach((s: string) => {
      map.set(s, [...(map.get(s) ?? []), r.first_name]);
    }));
    return map;
  }, [reps]);
  const hasCoverage = (reps?.length ?? 0) > 0;
  const coveredStates = US_STATES.filter((s) => coveredByState.has(s));
  const greyStates = US_STATES.filter((s) => !coveredByState.has(s));

  const { data: usage, refetch: refetchUsage } = useQuery({
    queryKey: ['shovels-usage'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shovels-permit-search', { body: { action: 'usage' } });
      if (error) return null;
      return data as { used: number | null; limit: number | null; remaining: number | null };
    },
  });
  // Worst case: every permit plus a new contractor lookup for each
  const worstCase = maxResults * 2;
  const remaining = usage?.remaining ?? null;
  const tooBig = remaining != null && worstCase > remaining;

  const addStates = (list: string[]) => setStates((s) => [...new Set([...s, ...list])].slice(0, 15));

  const handleSearch = async () => {
    if (!states.length || !focus.length) {
      toast({ title: "Pick at least one state and one permit type", variant: "destructive" });
      return;
    }
    if (tooBig) {
      toast({ title: "Not enough Shovels credits", description: `This search could use up to ${worstCase} credits; you have ${remaining} left. Lower Max permits.`, variant: "destructive" });
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('shovels-permit-search', {
        body: { states, focus, minUnits, days: Number(days), maxResults },
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ }
        }
        throw new Error(msg);
      }
      toast({
        title: "Shovels search complete",
        description: `${data.creditsUsed != null ? `Used ${data.creditsUsed} credits. ` : ""}Found ${data.permitsFound} permits (${data.permitsImported} new, ${Number(data.unitsImported ?? 0).toLocaleString()} new units). ${data.permitsMatched} matched existing companies, ${data.newCompaniesCreated} new leads.${data.greenLightLeads ? ` 🟢 ${data.greenLightLeads} green-light lead(s) sent to Instant Outreach.` : ""}${data.creditsRemaining != null ? ` ${data.creditsRemaining} Shovels credits left.` : ""}`,
      });
      refetchUsage();
      onSearchComplete();
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Permits with Shovels</DialogTitle>
          <DialogDescription>Pull real permit records and the contractors behind them.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>States</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-between font-normal">
                    {states.length ? `${states.length} state${states.length > 1 ? "s" : ""} selected` : "Select states..."}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  <div className="flex justify-between items-center pb-2 text-xs text-muted-foreground">
                    <span>Up to 15 states</span>
                    <button className="underline" onClick={() => setStates([])}>Clear</button>
                  </div>
                  {(() => {
                    const renderState = (s: string, isGrey: boolean) => {
                      const checked = states.includes(s);
                      const disabled = !checked && states.length >= 15;
                      const repNames = coveredByState.get(s)?.join(", ");
                      return (
                        <label key={s} title={repNames ? `Covered by ${repNames}` : "Grey state — no rep assigned"}
                          className={`flex items-center gap-1.5 text-sm rounded px-1 py-1 hover:bg-muted ${disabled ? "opacity-40" : "cursor-pointer"} ${isGrey ? "text-muted-foreground" : ""}`}>
                          <Checkbox checked={checked} disabled={disabled}
                            onCheckedChange={(v) => v ? addStates([s]) : setStates(states.filter((x) => x !== s))} />
                          {s}
                        </label>
                      );
                    };
                    return (
                      <div className="max-h-64 overflow-y-auto pr-1">
                        {hasCoverage && (
                          <>
                            <p className="text-xs font-medium pt-1 pb-1">Covered states <span className="font-normal text-muted-foreground">(rep territory)</span></p>
                            <div className="grid grid-cols-4 gap-1">
                              {coveredStates.map((s) => renderState(s, false))}
                            </div>
                            {greyStates.length > 0 && (
                              <>
                                <p className="text-xs font-medium text-muted-foreground pt-3 pb-1">Grey states <span className="font-normal">(no rep assigned)</span></p>
                                <div className="grid grid-cols-4 gap-1">
                                  {greyStates.map((s) => renderState(s, true))}
                                </div>
                              </>
                            )}
                          </>
                        )}
                        {!hasCoverage && (
                          <div className="grid grid-cols-4 gap-1">
                            {US_STATES.map((s) => renderState(s, false))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </PopoverContent>
              </Popover>
              <Select value="" onValueChange={(v) => addStates(regions?.find((r) => r.region_name === v)?.states ?? [])}>
                <SelectTrigger><SelectValue placeholder="Add a region..." /></SelectTrigger>
                <SelectContent>
                  {regions?.map((r) => <SelectItem key={r.id} value={r.region_name}>{r.region_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-1">
              {states.map((s) => {
                const isGrey = hasCoverage && !coveredByState.has(s);
                return (
                  <Badge key={s} variant={isGrey ? "outline" : "secondary"}
                    className={`gap-1 ${isGrey ? "border-dashed text-muted-foreground" : ""}`}
                    title={isGrey ? "Grey state — no rep assigned" : `Covered by ${coveredByState.get(s)?.join(", ")}`}>
                    {s}
                    <button onClick={() => setStates(states.filter((x) => x !== s))} aria-label={`Remove ${s}`}><X className="h-3 w-3" /></button>
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permit types</Label>
            <p className="text-xs text-muted-foreground">
              Only residential and mixed-use permits are pulled — commercial, office and industrial
              permits are skipped. New construction is the default; the others add extra queries.
            </p>
            {FOCUS.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={focus.includes(f.id)}
                  onCheckedChange={(c) => setFocus(c ? [...focus, f.id] : focus.filter((x) => x !== f.id))}
                />
                {f.label} <span className="text-muted-foreground">— {f.hint}</span>
              </label>
            ))}
          </div>

          {focus.includes("large_residential") && (
            <div className="space-y-2">
              <Label>Minimum units (large residential): {minUnits}</Label>
              <Slider value={[minUnits]} onValueChange={([v]) => setMinUnits(v)} min={10} max={500} step={10} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Filed within</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                New-construction permits are tagged about 45–60 days after filing, so short windows
                often come back empty — 90 days or more works best.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Max permits: {maxResults}</Label>
              <Slider value={[maxResults]} onValueChange={([v]) => setMaxResults(v)} min={5} max={100} step={5} />
              <p className="text-xs text-muted-foreground">
                Uses up to {worstCase} credits (1 per permit + 1 per new contractor; contractors you already have are free).
              </p>
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            {remaining != null
              ? <>Shovels credits left this month: <span className="font-semibold">{remaining}</span>{usage?.limit ? ` of ${usage.limit}` : ""}</>
              : "Checking Shovels credits..."}
            {tooBig && <p className="text-destructive text-xs mt-1">This search could exceed your remaining credits — lower Max permits.</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSearching}>Cancel</Button>
            <Button onClick={handleSearch} disabled={isSearching || tooBig}>
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {isSearching ? "Searching..." : "Search Permits"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
