import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RegionFilter, getFilterStates } from "@/lib/regions/regionConstants";
import { Perspective } from "@/components/common/PerspectiveSelector";
import type { PipelineMetrics } from "@/hooks/usePipelineAnalytics";

interface FunnelStage {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface CommunicationsFunnelProps {
  dateRange?: { from: Date; to: Date };
  perspective?: Perspective;
  userId?: string;
  regionFilter?: RegionFilter;
  metrics?: PipelineMetrics;
}

export function CommunicationsFunnel({ 
  dateRange, 
  perspective = "all_records", 
  userId,
  regionFilter = "all",
  metrics,
}: CommunicationsFunnelProps) {
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ["communications-funnel", dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), perspective, userId, regionFilter],
    queryFn: async () => {
      const filterStates = getFilterStates(regionFilter);
      
      // Format dates for queries
      const fromDate = dateRange?.from?.toISOString().split('T')[0];
      const toDate = dateRange?.to?.toISOString().split('T')[0];
      
      // Build communications query with filters
      let commQuery = supabase
        .from("company_communications")
        .select("id, sent_at, email_opened_at, email_responded_at, communication_type, assigned_to, company_id, user_id, companies!inner(state)");

      // Apply date filter
      if (fromDate && toDate) {
        commQuery = commQuery.gte("created_at", fromDate).lte("created_at", `${toDate}T23:59:59`);
      }

      // Apply perspective filter - use user_id for company_communications
      if (perspective === "my_records" && userId) {
        commQuery = commQuery.eq("user_id", userId);
      }

      // Apply region filter via state
      if (filterStates) {
        commQuery = commQuery.in("companies.state", filterStates);
      }

      const { data: communications, error: commError } = await commQuery;
      if (commError) throw commError;

      // Build activities query with filters
      let actQuery = supabase
        .from("outreach_activities")
        .select("id, activity_type, outcome, completed_date, scheduled_date, created_at, company_id, created_by, companies!inner(state)");

      // Apply date filter
      if (fromDate && toDate) {
        actQuery = actQuery.gte("created_at", fromDate).lte("created_at", `${toDate}T23:59:59`);
      }

      // Apply perspective filter
      if (perspective === "my_records" && userId) {
        actQuery = actQuery.eq("created_by", userId);
      }

      // Apply region filter via state
      if (filterStates) {
        actQuery = actQuery.in("companies.state", filterStates);
      }

      const { data: activities, error: actError } = await actQuery;
      if (actError) throw actError;

      // Calculate funnel metrics
      const emailsSent = communications?.filter(c => c.sent_at).length || 0;
      const emailsOpened = communications?.filter(c => c.email_opened_at).length || 0;
      const emailsReplied = communications?.filter(c => c.email_responded_at).length || 0;
      const callsMade = activities?.filter(a => a.activity_type === "Phone").length || 0;
      // Meetings booked = scheduled but NOT yet completed (no completed_date AND outcome not Completed)
      const meetingsBooked = activities?.filter(a => 
        ["Meeting", "Demo"].includes(a.activity_type) && 
        !a.completed_date &&
        a.outcome !== "Completed" &&
        a.outcome === "Scheduled"
      ).length || 0;
      // Meetings conducted = has completed_date OR outcome is Completed
      const meetingsConducted = activities?.filter(a => 
        ["Meeting", "Demo"].includes(a.activity_type) && 
        (a.completed_date || a.outcome === "Completed")
      ).length || 0;
      const handoffs = communications?.filter(c => c.assigned_to).length || 0;

      return {
        emailsSent,
        emailsOpened,
        emailsReplied,
        callsMade,
        meetingsBooked,
        meetingsConducted,
        handoffs,
      };
    },
    enabled: !metrics,
  });

  const resolvedFunnelData = metrics ? {
    emailsSent: metrics.commsSent,
    emailsOpened: metrics.emailsOpened,
    emailsReplied: metrics.responsesReceived,
    callsMade: metrics.phoneCalls,
    meetingsBooked: metrics.meetingsScheduled + metrics.demosScheduled,
    meetingsConducted: metrics.meetingsConducted,
    handoffs: metrics.leadsAssigned,
  } : funnelData;

  if (!metrics && isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communications Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4 h-48">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="flex-1 h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const baseCount = resolvedFunnelData?.emailsSent || 1;

  // Helper to calculate percentage with 1 decimal place
  const calcPercentage = (count: number) => {
    if (baseCount === 0) return 0;
    return parseFloat(((count / baseCount) * 100).toFixed(1));
  };

  const stages: FunnelStage[] = [
    {
      label: "Emails Sent",
      count: resolvedFunnelData?.emailsSent || 0,
      percentage: 100,
      color: "hsl(var(--primary))",
    },
    {
      label: "Emails Opened",
      count: resolvedFunnelData?.emailsOpened || 0,
      percentage: calcPercentage(resolvedFunnelData?.emailsOpened || 0),
      color: "hsl(217, 91%, 60%)", // blue-500
    },
    {
      label: "Emails Replied",
      count: resolvedFunnelData?.emailsReplied || 0,
      percentage: calcPercentage(resolvedFunnelData?.emailsReplied || 0),
      color: "hsl(217, 91%, 70%)", // blue-400
    },
    {
      label: "Calls Made",
      count: resolvedFunnelData?.callsMade || 0,
      percentage: calcPercentage(resolvedFunnelData?.callsMade || 0),
      color: "hsl(217, 91%, 80%)", // blue-300
    },
    {
      label: "Meetings Booked",
      count: resolvedFunnelData?.meetingsBooked || 0,
      percentage: calcPercentage(resolvedFunnelData?.meetingsBooked || 0),
      color: "hsl(142, 76%, 45%)", // green-500
    },
    {
      label: "Meetings Conducted",
      count: resolvedFunnelData?.meetingsConducted || 0,
      percentage: calcPercentage(resolvedFunnelData?.meetingsConducted || 0),
      color: "hsl(142, 76%, 36%)", // green-600
    },
    {
      label: "Handoffs",
      count: resolvedFunnelData?.handoffs || 0,
      percentage: calcPercentage(resolvedFunnelData?.handoffs || 0),
      color: "hsl(270, 70%, 70%)", // purple
    },
  ];

  const maxHeight = 200; // pixels

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Communications Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          {stages.map((stage, index) => {
            const barHeight = Math.max(
              (stage.percentage / 100) * maxHeight,
              20 // minimum height for visibility
            );

            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                {/* Percentage and Count */}
                <div className="text-center mb-2">
                  <div className="text-sm font-semibold text-muted-foreground">
                    {stage.percentage.toFixed(1)}%
                  </div>
                  <div className="text-lg font-bold">{stage.count.toLocaleString()}</div>
                </div>

                {/* Bar */}
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: stage.color,
                    minHeight: "20px",
                  }}
                />

                {/* Label */}
                <div className="text-xs text-muted-foreground text-center mt-2 leading-tight min-h-[2.5rem]">
                  {stage.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend with conversion rates */}
        <div className="mt-6 pt-4 border-t flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Open Rate:</span>
            <span className="font-semibold">
              {stages[1].percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Reply Rate:</span>
            <span className="font-semibold">
              {stages[2].percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Call Rate:</span>
            <span className="font-semibold">
              {stages[3].percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Booked Rate:</span>
            <span className="font-semibold">
              {stages[4].percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Conducted Rate:</span>
            <span className="font-semibold">
              {stages[5].percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Handoff Rate:</span>
            <span className="font-semibold">
              {stages[6].percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
