import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type QueryKeyLike = readonly unknown[];

const TABLE_TO_QUERY_KEYS: Record<string, QueryKeyLike[]> = {
  // Pages whose query keys don't match the table name
  company_communications: [["all-communications"]],
  building_permits: [["building-permits"], ["permit-stats"]],

  // Convenience invalidations (dashboards / aggregates)
  companies: [
    ["companies"],
    ["companies-count"],
    ["companies-by-status"],
    ["companies-by-priority"],
    ["recent-companies"],
    ["segment-performance"],
  ],
  contacts: [["contacts"], ["contacts-count"]],
  opportunities: [["opportunities"]],
  outreach_activities: [["activities"], ["monthly-activities"]],

  // Company AI status badge
  enrichment_logs: [["enrichment-status"]],
};

export function RealtimeQueryInvalidator() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("global-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          const table = (payload as any)?.table as string | undefined;
          if (!table) return;

          // Most of our list queries are keyed by table name (e.g. ['companies', ...])
          queryClient.invalidateQueries({ queryKey: [table] });

          // Some screens use custom keys (e.g. 'all-communications')
          const extraKeys = TABLE_TO_QUERY_KEYS[table];
          if (extraKeys?.length) {
            for (const key of extraKeys) {
              queryClient.invalidateQueries({ queryKey: key as any });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}
