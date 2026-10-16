import { useState } from "react";
import * as XLSX from "@e965/xlsx";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useExportQuota } from "@/hooks/useExportQuota";
import { getPermitUnits } from "@/lib/permits/permitUnits";

interface Props {
  permits: any[];
  listName: string;
}

export function PermitExportButton({ permits, listName }: Props) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { checkQuota, logExport } = useExportQuota();

  const run = async () => {
    if (!permits.length) return;
    setBusy(true);
    try {
      const check = await checkQuota(permits.length, "building_permits");
      if (!check?.allowed || check.requires_approval) {
        toast({
          title: "Export needs approval",
          description: check?.reason || "This export is over your limit — ask an admin.",
          variant: "destructive",
        });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const rows = permits.map((p) => {
        const u = getPermitUnits(p);
        return {
          "Permit #": p.permit_number ?? "",
          Project: p.project_name ?? "",
          Description: p.project_description ?? "",
          "Filed For": (p.permit_tags ?? []).join(", "),
          "Project Type": p.project_type ?? "",
          Status: p.status ?? "",
          Address: p.address_line ?? "",
          City: p.city ?? "",
          State: p.state ?? "",
          Zip: p.zip ?? "",
          Units: u.units ? (u.estimated ? `~${u.units}` : u.units) : "",
          "Est. Value": p.estimated_value ?? "",
          "Filed Date": p.filed_date ?? "",
          "Issued Date": p.issued_date ?? "",
          Builder: p.builder_name ?? p.builder_company?.company_name ?? "",
          "Contractor Phone": p.applicant_phone ?? "",
          "Contractor Email": p.applicant_email ?? "",
          Website: p.contractor_website ?? "",
          License: p.contractor_license ?? "",
          "Green Light": p.green_light ? "Yes" : "",
          Outreach: p.outreach_status ?? "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows, { origin: "A2" });
      XLSX.utils.sheet_add_aoa(ws, [[`Exported by ${user?.id} on ${new Date().toISOString()}`]], { origin: "A1" });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Permits");
      const safe = listName.replace(/[^a-z0-9-]+/gi, "_");
      XLSX.writeFile(wb, `permits_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      await logExport("building_permits", permits.length, "EXCEL", { list: listName });
      toast({ title: `Exported ${permits.length} permits`, description: listName });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={run} disabled={busy || !permits.length}>
      <Download className="h-4 w-4 mr-2" />
      Export {listName} ({permits.length})
    </Button>
  );
}
