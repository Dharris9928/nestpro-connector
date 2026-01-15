import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, FunnelChart, Funnel, Cell, Tooltip, LabelList } from "recharts";
import { ArrowRight, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { EmailedCompany, ResponseDetail, HandoffDetail } from "@/hooks/usePipelineAnalytics";

interface PipelineFunnelChartProps {
  metrics: {
    commsSent: number;
    emailsOpened: number;
    responsesReceived: number;
    meetingsScheduled: number;
    meetingsCompleted: number;
    leadsAssigned: number;
    closedDeals: number;
    openRate: number;
    responseRate: number;
    scheduleRate: number;
    completionRate: number;
    handoffRate: number;
    closeRate: number;
    emailedCompanies?: EmailedCompany[];
    responseDetails?: ResponseDetail[];
    handoffDetails?: HandoffDetail[];
  } | undefined;
  isLoading: boolean;
  regionLabel?: string;
}

const COLORS = [
  "hsl(217, 91%, 60%)",  // Blue - Sent
  "hsl(186, 91%, 45%)",  // Cyan - Opened
  "hsl(142, 76%, 36%)",  // Green - Responded
  "hsl(45, 93%, 47%)",   // Yellow - Scheduled
  "hsl(24, 95%, 53%)",   // Orange - Completed
  "hsl(280, 87%, 61%)",  // Purple - Assigned
  "hsl(160, 84%, 39%)",  // Emerald - Closed
];

export function PipelineFunnelChart({ metrics, isLoading, regionLabel }: PipelineFunnelChartProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const funnelData = [
    { name: "Sent", value: metrics.commsSent, fill: COLORS[0] },
    { name: "Opened", value: metrics.emailsOpened, fill: COLORS[1] },
    { name: "Responded", value: metrics.responsesReceived, fill: COLORS[2] },
    { name: "Scheduled", value: metrics.meetingsScheduled, fill: COLORS[3] },
    { name: "Completed", value: metrics.meetingsCompleted, fill: COLORS[4] },
    { name: "Assigned", value: metrics.leadsAssigned, fill: COLORS[5] },
    { name: "Closed", value: metrics.closedDeals, fill: COLORS[6] },
  ];

  const conversionSteps = [
    { from: "Sent", to: "Opened", rate: metrics.openRate },
    { from: "Opened", to: "Responded", rate: metrics.responseRate },
    { from: "Responded", to: "Scheduled", rate: metrics.scheduleRate },
    { from: "Scheduled", to: "Completed", rate: metrics.completionRate },
    { from: "Completed", to: "Assigned", rate: metrics.handoffRate },
    { from: "Assigned", to: "Closed", rate: metrics.closeRate },
  ];

  // Custom tooltip for funnel chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Count: <span className="font-medium text-foreground">{data.value.toLocaleString()}</span>
          </p>
          {data.value > 0 && (
            <p className="text-xs text-muted-foreground mt-1">Click to see companies</p>
          )}
        </div>
      );
    }
    return null;
  };

  const handleFunnelClick = (data: any) => {
    if (data && data.name && data.value > 0) {
      setExpandedStage(expandedStage === data.name ? null : data.name);
    }
  };

  const getCompaniesForStage = (stage: string) => {
    switch (stage) {
      case "Sent":
        return metrics.emailedCompanies?.map(c => ({
          name: c.company_name,
          detail: format(new Date(c.sent_at), "MMM d, yyyy"),
        })) || [];
      case "Responded":
        return metrics.responseDetails?.map(r => ({
          name: r.company_name,
          detail: r.contact_name ? `${r.contact_name} - ${format(new Date(r.responded_at), "MMM d")}` : format(new Date(r.responded_at), "MMM d"),
        })) || [];
      case "Assigned":
        return metrics.handoffDetails?.map(h => ({
          name: h.company_name,
          detail: `To: ${h.assigned_to_name}`,
        })) || [];
      default:
        return [];
    }
  };

  const stageCompanies = expandedStage ? getCompaniesForStage(expandedStage) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Pipeline Funnel
          {regionLabel && <span className="text-sm font-normal text-muted-foreground">({regionLabel})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip content={<CustomTooltip />} />
              <Funnel
                dataKey="value"
                data={funnelData}
                isAnimationActive
                onClick={handleFunnelClick}
              >
                {funnelData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill} 
                    style={{ cursor: entry.value > 0 ? 'pointer' : 'default' }}
                  />
                ))}
                <LabelList
                  position="right"
                  fill="#888"
                  stroke="none"
                  dataKey="name"
                  className="text-xs"
                />
                <LabelList
                  position="center"
                  fill="#fff"
                  stroke="none"
                  dataKey="value"
                  className="text-sm font-bold"
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Expanded Company Details */}
        {expandedStage && stageCompanies.length > 0 && (
          <div className="mt-4 border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{expandedStage} - Companies ({stageCompanies.length})</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setExpandedStage(null)}
                className="h-6 px-2"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[120px]">
              <div className="space-y-1">
                {stageCompanies.map((company, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted">
                    <span className="font-medium">{company.name}</span>
                    <span className="text-muted-foreground text-xs">{company.detail}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Show hint when no stage selected */}
        {!expandedStage && (metrics.emailedCompanies?.length || 0) > 0 && (
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">Click on Sent, Responded, or Assigned stages to see company details</p>
          </div>
        )}

        {/* Conversion rates */}
        <div className="mt-6 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Conversion Rates</p>
          <div className="flex flex-wrap gap-2">
            {conversionSteps.map((step, index) => (
              <div
                key={step.from}
                className="flex items-center gap-1 text-sm bg-muted/50 rounded-full px-3 py-1"
              >
                <span className="font-medium" style={{ color: COLORS[index] }}>
                  {step.from}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium" style={{ color: COLORS[index + 1] }}>
                  {step.to}
                </span>
                <span className="ml-1 font-bold">
                  {step.rate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
