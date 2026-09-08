import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type QueryKeyLike = readonly unknown[];

const TABLE_TO_QUERY_KEYS: Record<string, QueryKeyLike[]> = {
  // Pages whose query keys don't match the table name
  company_communications: [["all-communications"], ["communications-funnel"], ["pipeline-analytics"]],
  building_permits: [["building-permits"], ["permit-stats"]],
  
  // Apollo engagement data affects multiple dashboards
  apollo_email_activities: [
    ["all-communications"],
    ["communications-funnel"],
    ["pipeline-analytics"],
    ["apollo-email-activities"],
  ],

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
  opportunities: [["opportunities"], ["pipeline-analytics"], ["communications-funnel"]],
  outreach_activities: [["activities"], ["monthly-activities"], ["pipeline-analytics"], ["communications-funnel"]],
  job_quotes: [["job-quotes"], ["job-quotes-trends"], ["job-quotes-submission-trends"]],

  // Company AI status badge
  enrichment_logs: [["enrichment-status"]],
};

export function RealtimeQueryInvalidator() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Listen for auth state changes to only connect when authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Only establish realtime connection when user is authenticated
    if (!isAuthenticated) return;

    const channel = supabase
      .channel("global-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          const table = (payload as any)?.table as string | undefined;
          if (!table) return;

          // Most of our list queries are keyed by table name (e.g. ['companies', ...])
          void queryClient.invalidateQueries({ queryKey: [table] });

          // Some screens use custom keys (e.g. 'all-communications')
          const extraKeys = TABLE_TO_QUERY_KEYS[table];
          if (extraKeys?.length) {
            for (const key of extraKeys) {
              void queryClient.invalidateQueries({ queryKey: key as any });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, isAuthenticated]);

  return null;
}
