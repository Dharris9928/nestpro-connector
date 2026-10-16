import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGreenLightLeads } from "@/hooks/useGreenLightLeads";
import { useUserRole } from "@/hooks/useUserRole";
import { GreenLightSettingsCard } from "@/components/permits/GreenLightSettingsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Phone, Mail, Check, X, Building2 } from "lucide-react";
import { toast } from "sonner";

const money = (v: number | null) => v == null ? null : v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function InstantOutreach() {
  const [tab, setTab] = useState<"new" | "contacted" | "dismissed">("new");
  const { data: leads, isLoading } = useGreenLightLeads(tab);
  const { data: role } = useUserRole();
  const isAdmin = role?.role === "admin";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const setStatus = async (id: string, outreach_status: string) => {
    const { error } = await supabase.from("building_permits").update({ outreach_status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(outreach_status === "contacted" ? "Marked as contacted" : outreach_status === "dismissed" ? "Dismissed" : "Moved back to New");
    qc.invalidateQueries({ queryKey: ["green-light-leads"] });
  };

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-success" />
        <div>
          <h1 className="text-2xl font-bold">Instant Outreach</h1>
          <p className="text-sm text-muted-foreground">Permit leads that passed every green-light rule — reach out now.</p>
        </div>
      </div>
      <div className={isAdmin ? "grid gap-4 lg:grid-cols-[1fr_340px]" : ""}>
        <div className="space-y-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList><TabsTrigger value="new">New</TabsTrigger><TabsTrigger value="contacted">Contacted</TabsTrigger><TabsTrigger value="dismissed">Dismissed</TabsTrigger></TabsList>
          </Tabs>
          {isLoading ? <Skeleton className="h-40" /> : !leads?.length ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No {tab} green-light leads. New ones appear here automatically after each permit search.</CardContent></Card>
          ) : leads.map((l) => (
            <Card key={l.id} className="border-l-4 border-l-success">
              <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />{l.builder_name ?? "Unknown contractor"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {[l.num_units ? `${l.num_units} units` : null, money(l.estimated_value), [l.city, l.state].filter(Boolean).join(", "), l.permit_number ? `Permit ${l.permit_number}` : null].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-sm truncate">{l.project_name}</div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {l.green_light_reasons.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                    {l.rep && <Badge variant="outline">Rep: {l.rep.is_firm ? l.rep.first_name : `${l.rep.first_name} ${l.rep.last_name ?? ""}`}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm pt-1">
                    {l.applicant_phone && <a className="flex items-center gap-1 text-primary hover:underline" href={`tel:${l.applicant_phone}`}><Phone className="h-3 w-3" />{l.applicant_phone}</a>}
                    {l.applicant_email && <a className="flex items-center gap-1 text-primary hover:underline" href={`mailto:${l.applicant_email}`}><Mail className="h-3 w-3" />{l.applicant_email}</a>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {l.builder_company_id && <Button size="sm" variant="outline" onClick={() => navigate(`/companies/${l.builder_company_id}`)}>Open company</Button>}
                  {tab === "new" ? <>
                    <Button size="sm" onClick={() => setStatus(l.id, "contacted")}><Check className="h-4 w-4 mr-1" />Contacted</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "dismissed")}><X className="h-4 w-4" /></Button>
                  </> : <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "new")}>Move back to New</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {isAdmin && <div><GreenLightSettingsCard /></div>}
      </div>
    </div>
  );
}
