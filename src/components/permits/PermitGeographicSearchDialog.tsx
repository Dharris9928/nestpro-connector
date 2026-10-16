import { useState } from "react";
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
import { Loader2, Search, X } from "lucide-react";

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
  { id: "large_residential", label: "Large residential", hint: "Multi-family / big developments" },
  { id: "hvac", label: "HVAC / thermostat", hint: "Permits tagged HVAC" },
  { id: "new_construction", label: "New construction", hint: "New builds" },
] as const;

export const PermitGeographicSearchDialog = ({ open, onOpenChange, onSearchComplete }: Props) => {
  const [states, setStates] = useState<string[]>([]);
  const [focus, setFocus] = useState<string[]>(["large_residential", "hvac", "new_construction"]);
  const [minUnits, setMinUnits] = useState(50);
  const [days, setDays] = useState("30");
  const [maxResults, setMaxResults] = useState(25);
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

  const addStates = (list: string[]) => setStates((s) => [...new Set([...s, ...list])].slice(0, 15));

  const handleSearch = async () => {
    if (!states.length || !focus.length) {
      toast({ title: "Pick at least one state and one permit type", variant: "destructive" });
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
        description: `Found ${data.permitsFound} (${data.permitsImported} new). ${data.permitsMatched} matched existing companies, ${data.newCompaniesCreated} new leads.${data.creditsRemaining != null ? ` ${data.creditsRemaining} Shovels credits left.` : ""}`,
      });
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
              <Select value="" onValueChange={(v) => addStates([v])}>
                <SelectTrigger><SelectValue placeholder="Add a state..." /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value="" onValueChange={(v) => addStates(regions?.find((r) => r.region_name === v)?.states ?? [])}>
                <SelectTrigger><SelectValue placeholder="Add a region..." /></SelectTrigger>
                <SelectContent>
                  {regions?.map((r) => <SelectItem key={r.id} value={r.region_name}>{r.region_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-1">
              {states.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1">
                  {s}
                  <button onClick={() => setStates(states.filter((x) => x !== s))} aria-label={`Remove ${s}`}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permit types</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Max permits: {maxResults}</Label>
              <Slider value={[maxResults]} onValueChange={([v]) => setMaxResults(v)} min={5} max={200} step={5} />
              <p className="text-xs text-muted-foreground">Each permit and contractor uses one Shovels credit.</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSearching}>Cancel</Button>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {isSearching ? "Searching..." : "Search Permits"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
