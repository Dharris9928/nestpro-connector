import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Trophy, DollarSign, TrendingUp } from "lucide-react";

interface ClosedDealsCardProps {
  metrics: {
    leadsAssigned: number;
    closedDeals: number;
    closedDealValue: number;
    closeRate: number;
    previousPeriod: {
      closedDeals: number;
    };
  } | undefined;
  isLoading: boolean;
}

export function ClosedDealsCard({ metrics, isLoading }: ClosedDealsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const percentChange = metrics.previousPeriod.closedDeals > 0
    ? ((metrics.closedDeals - metrics.previousPeriod.closedDeals) / metrics.previousPeriod.closedDeals) * 100
    : metrics.closedDeals > 0 ? 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-emerald-500" />
          Closed Deals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Close Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>Close Rate</span>
            </div>
            <span className="text-lg font-bold">{metrics.closeRate.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(metrics.closeRate, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {metrics.closedDeals} closed from {metrics.leadsAssigned} assigned leads
          </p>
        </div>

        {/* Closed Deal Value */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span>Closed Deal Value</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-500 mt-2">
            {formatCurrency(metrics.closedDealValue)}
          </p>
          <p className="text-xs text-muted-foreground">
            From {metrics.closedDeals} closed deal{metrics.closedDeals !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Deals Closed Count with Trend */}
        <div className="pt-2 border-t">
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-500">{metrics.closedDeals}</p>
            <p className="text-sm text-muted-foreground">Deals Won</p>
            {percentChange !== 0 && (
              <p className={`text-xs mt-1 ${percentChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {percentChange > 0 ? '+' : ''}{percentChange.toFixed(0)}% vs previous period
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
