import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import { subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, format } from "date-fns";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function pctChange(current: number, prev: number) {
  if (prev === 0) return current === 0 ? 0 : 100;
  return ((current - prev) / prev) * 100;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function ChangeBadge({ value }: { value: number }) {
  const rounded = Math.round(value * 10) / 10;
  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : Minus;
  const color = rounded > 0 ? "text-success" : rounded < 0 ? "text-destructive" : "text-muted-foreground";
  const sign = rounded > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {sign}{rounded}%
    </span>
  );
}

interface QuoteRow {
  date_received: string;
  price: number | null;
}

export function JobQuotesTrends() {
  const { data: rows = [] } = useQuery({
    queryKey: ["job-quotes-trends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_quotes")
        .select("date_received, price")
        .not("date_received", "is", null);
      if (error) throw error;
      return (data || []) as unknown as QuoteRow[];
    },
  });

  const now = new Date();
  const validRows = rows.filter((r) => r.price !== null && r.price !== undefined) as { date_received: string; price: number }[];

  const countBetween = (from: Date, to: Date) =>
    rows.filter((r) => {
      const d = new Date(r.date_received);
      return d >= from && d <= to;
    }).length;

  const avgValueBetween = (from: Date, to: Date) => {
    const matching = validRows.filter((r) => {
      const d = new Date(r.date_received);
      return d >= from && d <= to;
    });
    if (matching.length === 0) return 0;
    return matching.reduce((sum, r) => sum + (r.price || 0), 0) / matching.length;
  };

  // 30 & 60 day windows — counts
  const last30Count = countBetween(subDays(now, 30), now);
  const prev30Count = countBetween(subDays(now, 60), subDays(now, 30));
  const last60Count = countBetween(subDays(now, 60), now);
  const prev60Count = countBetween(subDays(now, 120), subDays(now, 60));

  // 30 & 60 day windows — avg values
  const last30Avg = avgValueBetween(subDays(now, 30), now);
  const prev30Avg = avgValueBetween(subDays(now, 60), subDays(now, 30));
  const last60Avg = avgValueBetween(subDays(now, 60), now);
  const prev60Avg = avgValueBetween(subDays(now, 120), subDays(now, 60));

  // Month over month (calendar months) — counts
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const thisMonthCount = countBetween(thisMonthStart, now);
  const lastMonthCount = countBetween(lastMonthStart, lastMonthEnd);

  // Month over month — avg values
  const thisMonthAvg = avgValueBetween(thisMonthStart, now);
  const lastMonthAvg = avgValueBetween(lastMonthStart, lastMonthEnd);

  // Quarter over quarter — counts
  const thisQStart = startOfQuarter(now);
  const lastQStart = startOfQuarter(subQuarters(now, 1));
  const lastQEnd = endOfQuarter(subQuarters(now, 1));
  const thisQCount = countBetween(thisQStart, now);
  const lastQCount = countBetween(lastQStart, lastQEnd);

  // Quarter over quarter — avg values
  const thisQAvg = avgValueBetween(thisQStart, now);
  const lastQAvg = avgValueBetween(lastQStart, lastQEnd);

  // 6 month chart — counts
  const monthlyVolume = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const isCurrent = i === 5;
    return {
      label: format(d, "MMM"),
      count: countBetween(start, isCurrent ? now : end),
      isCurrent,
    };
  });

  // 6 month chart — avg values
  const monthlyValue = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const isCurrent = i === 5;
    return {
      label: format(d, "MMM"),
      avgValue: Math.round(avgValueBetween(start, isCurrent ? now : end)),
      isCurrent,
    };
  });

  return (
    <div className="space-y-4">
      {/* Volume Trends */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quote Volume Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Metrics */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Last 30 Days</p>
                <p className="text-2xl font-bold">{last30Count}</p>
                <ChangeBadge value={pctChange(last30Count, prev30Count)} />
                <p className="text-xs text-muted-foreground">vs prior 30d ({prev30Count})</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Last 60 Days</p>
                <p className="text-2xl font-bold">{last60Count}</p>
                <ChangeBadge value={pctChange(last60Count, prev60Count)} />
                <p className="text-xs text-muted-foreground">vs prior 60d ({prev60Count})</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Month over Month</p>
                <p className="text-2xl font-bold">{thisMonthCount}</p>
                <ChangeBadge value={pctChange(thisMonthCount, lastMonthCount)} />
                <p className="text-xs text-muted-foreground">vs last month ({lastMonthCount})</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Quarter over Quarter</p>
                <p className="text-2xl font-bold">{thisQCount}</p>
                <ChangeBadge value={pctChange(thisQCount, lastQCount)} />
                <p className="text-xs text-muted-foreground">vs last quarter ({lastQCount})</p>
              </div>
            </div>

            {/* Volume Chart */}
            <div className="lg:col-span-3 h-[180px]">
              <p className="text-xs text-muted-foreground mb-2">Monthly volume — last 6 months</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyVolume}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(value: any) => [`${value} quotes`, "Submitted"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {monthlyVolume.map((m, i) => (
                      <Cell key={i} fill={m.isCurrent ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value Trends */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Average Quote Value Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Value Metrics */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Last 30 Days</p>
                <p className="text-2xl font-bold">{formatCurrency(last30Avg)}</p>
                <ChangeBadge value={pctChange(last30Avg, prev30Avg)} />
                <p className="text-xs text-muted-foreground">vs prior 30d ({formatCurrency(prev30Avg)})</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Last 60 Days</p>
                <p className="text-2xl font-bold">{formatCurrency(last60Avg)}</p>
                <ChangeBadge value={pctChange(last60Avg, prev60Avg)} />
                <p className="text-xs text-muted-foreground">vs prior 60d ({formatCurrency(prev60Avg)})</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Month over Month</p>
                <p className="text-2xl font-bold">{formatCurrency(thisMonthAvg)}</p>
                <ChangeBadge value={pctChange(thisMonthAvg, lastMonthAvg)} />
                <p className="text-xs text-muted-foreground">vs last month ({formatCurrency(lastMonthAvg)})</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Quarter over Quarter</p>
                <p className="text-2xl font-bold">{formatCurrency(thisQAvg)}</p>
                <ChangeBadge value={pctChange(thisQAvg, lastQAvg)} />
                <p className="text-xs text-muted-foreground">vs last quarter ({formatCurrency(lastQAvg)})</p>
              </div>
            </div>

            {/* Value Chart */}
            <div className="lg:col-span-3 h-[180px]">
              <p className="text-xs text-muted-foreground mb-2">Monthly avg value — last 6 months</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyValue}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(value: any) => [formatCurrency(value), "Avg Quote Value"]}
                  />
                  <Bar dataKey="avgValue" radius={[4, 4, 0, 0]}>
                    {monthlyValue.map((m, i) => (
                      <Cell key={i} fill={m.isCurrent ? "hsl(var(--success))" : "hsl(var(--success) / 0.4)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
