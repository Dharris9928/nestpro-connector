import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FunnelStage {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export function CommunicationsFunnel() {
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ["communications-funnel"],
    queryFn: async () => {
      // Get email communications data
      const { data: communications, error: commError } = await supabase
        .from("company_communications")
        .select("id, sent_at, email_opened_at, email_responded_at, communication_type, assigned_to");

      if (commError) throw commError;

      // Get outreach activities for calls and meetings
      const { data: activities, error: actError } = await supabase
        .from("outreach_activities")
        .select("id, activity_type, outcome");

      if (actError) throw actError;

      // Calculate funnel metrics
      const emailsSent = communications?.filter(c => c.sent_at).length || 0;
      const emailsOpened = communications?.filter(c => c.email_opened_at).length || 0;
      const emailsReplied = communications?.filter(c => c.email_responded_at).length || 0;
      const callsMade = activities?.filter(a => a.activity_type === "Phone").length || 0;
      const meetingsBooked = activities?.filter(a => 
        a.activity_type === "Meeting" && a.outcome === "Scheduled"
      ).length || 0;
      const handoffs = communications?.filter(c => c.assigned_to).length || 0;

      return {
        emailsSent,
        emailsOpened,
        emailsReplied,
        callsMade,
        meetingsBooked,
        handoffs,
      };
    },
  });

  if (isLoading) {
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

  const baseCount = funnelData?.emailsSent || 1;

  const stages: FunnelStage[] = [
    {
      label: "Emails Sent",
      count: funnelData?.emailsSent || 0,
      percentage: 100,
      color: "hsl(var(--primary))",
    },
    {
      label: "Emails Opened",
      count: funnelData?.emailsOpened || 0,
      percentage: baseCount > 0 ? Math.round((funnelData?.emailsOpened || 0) / baseCount * 100) : 0,
      color: "hsl(217, 91%, 60%)", // blue-500
    },
    {
      label: "Emails Replied",
      count: funnelData?.emailsReplied || 0,
      percentage: baseCount > 0 ? Math.round((funnelData?.emailsReplied || 0) / baseCount * 100) : 0,
      color: "hsl(217, 91%, 70%)", // blue-400
    },
    {
      label: "Calls Made",
      count: funnelData?.callsMade || 0,
      percentage: baseCount > 0 ? Math.round((funnelData?.callsMade || 0) / baseCount * 100) : 0,
      color: "hsl(217, 91%, 80%)", // blue-300
    },
    {
      label: "Meetings Booked",
      count: funnelData?.meetingsBooked || 0,
      percentage: baseCount > 0 ? Math.round((funnelData?.meetingsBooked || 0) / baseCount * 100) : 0,
      color: "hsl(217, 91%, 85%)", // blue-200
    },
    {
      label: "Handoffs",
      count: funnelData?.handoffs || 0,
      percentage: baseCount > 0 ? Math.round((funnelData?.handoffs || 0) / baseCount * 100) : 0,
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
                    {stage.percentage}%
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
        <div className="mt-6 pt-4 border-t flex flex-wrap justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Open Rate:</span>
            <span className="font-semibold">
              {stages[1].percentage}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Reply Rate:</span>
            <span className="font-semibold">
              {stages[2].percentage}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Call Rate:</span>
            <span className="font-semibold">
              {stages[3].percentage}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Meeting Rate:</span>
            <span className="font-semibold">
              {stages[4].percentage}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Handoff Rate:</span>
            <span className="font-semibold">
              {stages[5].percentage}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
