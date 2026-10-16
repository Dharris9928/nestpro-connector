import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Settings = {
  enabled: boolean; require_big_project: boolean; min_units: number; min_value: number;
  require_contact: boolean; require_new_contractor: boolean; require_territory: boolean;
};

export function GreenLightSettingsCard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["green-light-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("green_light_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data as Settings;
    },
  });
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (!s) return null;

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("green_light_settings").update({
      ...s, min_units: Math.max(1, Number(s.min_units) || 1), min_value: Math.max(0, Number(s.min_value) || 0),
      updated_at: new Date().toISOString(), updated_by: user?.id,
    }).eq("id", 1);
    if (error) { setSaving(false); return toast.error(error.message); }
    const { data: n, error: re } = await supabase.rpc("refresh_green_lights");
    setSaving(false);
    if (re) return toast.error(re.message);
    toast.success(`Rules saved — ${n} permits now green-lit`);
    qc.invalidateQueries({ queryKey: ["green-light-settings"] });
    qc.invalidateQueries({ queryKey: ["green-light-leads"] });
  };

  const row = (key: keyof Settings, label: string, hint: string) => (
    <div className="flex items-start justify-between gap-4">
      <div><Label>{label}</Label><p className="text-xs text-muted-foreground">{hint}</p></div>
      <Switch checked={s[key] as boolean} onCheckedChange={(v) => setS({ ...s, [key]: v })} />
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Green-light rules</CardTitle>
        <CardDescription>A permit lights up only when every rule that's switched on is met.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {row("enabled", "Green lights on", "Turn the whole system on or off")}
        {row("require_big_project", "Big project", "Meets the unit count or job value below")}
        <div className="grid grid-cols-2 gap-3 pl-1">
          <div><Label className="text-xs">Minimum units</Label>
            <Input type="number" min={1} value={s.min_units} onChange={(e) => setS({ ...s, min_units: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">…or minimum job value ($)</Label>
            <Input type="number" min={0} value={s.min_value} onChange={(e) => setS({ ...s, min_value: Number(e.target.value) })} /></div>
        </div>
        {row("require_contact", "Contact info present", "Contractor has a phone or email")}
        {row("require_new_contractor", "Brand-new contractor", "Not already a company in the CRM")}
        {row("require_territory", "In a rep's territory", "Permit's state is covered by an active rep")}
        <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save & re-check permits"}</Button>
      </CardContent>
    </Card>
  );
}
