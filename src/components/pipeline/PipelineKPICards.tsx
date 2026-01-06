import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, MailOpen, MessageSquareReply, CalendarPlus, CalendarCheck, UserCheck, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: number;
  previousValue: number;
  icon: React.ReactNode;
  colorClass: string;
  format?: "number" | "currency";
}

function KPICard({ label, value, previousValue, icon, colorClass, format = "number" }: KPICardProps) {
  const percentChange = previousValue > 0 
    ? ((value - previousValue) / previousValue) * 100 
    : value > 0 ? 100 : 0;
  
  const isPositive = percentChange > 0;
  const isNegative = percentChange < 0;
  const isNeutral = percentChange === 0;

  const formattedValue = format === "currency" 
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : value.toLocaleString();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg", colorClass)}>
            {icon}
          </div>
          <div className="flex items-center gap-1 text-sm">
            {isPositive && <TrendingUp className="h-3 w-3 text-green-500" />}
            {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
            {isNeutral && <Minus className="h-3 w-3 text-muted-foreground" />}
            <span className={cn(
              "font-medium",
              isPositive && "text-green-500",
              isNegative && "text-red-500",
              isNeutral && "text-muted-foreground"
            )}>
              {isPositive && "+"}
              {percentChange.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{formattedValue}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function KPICardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

interface PipelineKPICardsProps {
  metrics: {
    commsSent: number;
    emailsOpened: number;
    responsesReceived: number;
    meetingsScheduled: number;
    meetingsCompleted: number;
    leadsAssigned: number;
    closedDeals: number;
    closedDealValue: number;
    totalPipelineValue: number;
    previousPeriod: {
      commsSent: number;
      emailsOpened: number;
      responsesReceived: number;
      meetingsScheduled: number;
      meetingsCompleted: number;
      leadsAssigned: number;
      closedDeals: number;
    };
  } | undefined;
  isLoading: boolean;
}

export function PipelineKPICards({ metrics, isLoading }: PipelineKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const kpiData = [
    {
      label: "Comms Sent",
      value: metrics.commsSent,
      previousValue: metrics.previousPeriod.commsSent,
      icon: <Mail className="h-5 w-5 text-blue-600" />,
      colorClass: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Emails Opened",
      value: metrics.emailsOpened,
      previousValue: metrics.previousPeriod.emailsOpened,
      icon: <MailOpen className="h-5 w-5 text-cyan-600" />,
      colorClass: "bg-cyan-100 dark:bg-cyan-900/30",
    },
    {
      label: "Responses Received",
      value: metrics.responsesReceived,
      previousValue: metrics.previousPeriod.responsesReceived,
      icon: <MessageSquareReply className="h-5 w-5 text-green-600" />,
      colorClass: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Meetings Scheduled",
      value: metrics.meetingsScheduled,
      previousValue: metrics.previousPeriod.meetingsScheduled,
      icon: <CalendarPlus className="h-5 w-5 text-yellow-600" />,
      colorClass: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      label: "Meetings Completed",
      value: metrics.meetingsCompleted,
      previousValue: metrics.previousPeriod.meetingsCompleted,
      icon: <CalendarCheck className="h-5 w-5 text-orange-600" />,
      colorClass: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      label: "Leads Assigned",
      value: metrics.leadsAssigned,
      previousValue: metrics.previousPeriod.leadsAssigned,
      icon: <UserCheck className="h-5 w-5 text-purple-600" />,
      colorClass: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      label: "Closed Deals",
      value: metrics.closedDeals,
      previousValue: metrics.previousPeriod.closedDeals,
      icon: <Trophy className="h-5 w-5 text-emerald-600" />,
      colorClass: "bg-emerald-100 dark:bg-emerald-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiData.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
