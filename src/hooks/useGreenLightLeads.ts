import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

export type GreenLightLead = {
  id: string;
  permit_number: string | null;
  project_name: string | null;
  builder_name: string | null;
  builder_company_id: string | null;
  num_units: number | null;
  estimated_value: number | null;
  city: string | null;
  state: string | null;
  applicant_phone: string | null;
  applicant_email: string | null;
  filed_date: string | null;
  green_lit_at: string | null;
  green_light_reasons: string[];
  green_light_rep_id: string | null;
  outreach_status: string;
  rep?: { first_name: string; last_name: string | null; is_firm: boolean | null } | null;
};

/** Admins see every green-light lead; everyone else sees leads in their own territory. */
export function useGreenLightLeads(status: "new" | "contacted" | "dismissed" | "all" = "new") {
  const { data: role } = useUserRole();
  const isAdmin = role?.role === "admin";
  return useQuery({
    queryKey: ["green-light-leads", status, isAdmin],
    enabled: role !== undefined,
    queryFn: async () => {
      let q = supabase
        .from("building_permits")
        .select("id, permit_number, project_name, builder_name, builder_company_id, num_units, estimated_value, city, state, applicant_phone, applicant_email, filed_date, green_lit_at, green_light_reasons, green_light_rep_id, outreach_status, rep:sales_reps!building_permits_green_light_rep_id_fkey(first_name, last_name, is_firm)")
        .eq("green_light", true)
        .order("green_lit_at", { ascending: false })
        .limit(500);
      if (status !== "all") q = q.eq("outreach_status", status);
      if (!isAdmin) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: reps } = await supabase.from("sales_reps").select("id").ilike("email", user?.email ?? "__none__");
        const ids = (reps ?? []).map((r) => r.id);
        if (!ids.length) return [] as GreenLightLead[];
        q = q.in("green_light_rep_id", ids);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as GreenLightLead[];
    },
  });
}
