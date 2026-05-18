import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, format } from "date-fns";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function pctChange(current: number, prev: number) {
  if (prev === 0) return current === 0 ? 0 : 100;
  return ((current - prev) / prev) * 100;
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

export function JobQuotesTrends() {
  const { data: rows = [] } = useQuery({
    queryKey: ["job-quotes-trends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_quotes")
        .select("date_received")
        .not("date_received", "is", null);
      if (error) throw error;
      return data || [];
    },
  });

  const now = new Date();
  const dates = rows.map((r: any) => new Date(r.date_received));

  const countBetween = (from: Date, to: Date) =>
    dates.filter((d) => d >= from && d <= to).length;

  // 30 & 60 day windows
  const last30 = countBetween(subDays(now, 30), now);
  const prev30 = countBetween(subDays(now, 60), subDays(now, 30));
  const last60 = countBetween(subDays(now, 60), now);
  const prev60 = countBetween(subDays(now, 120), subDays(now, 60));

  // Month over month (calendar months)
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const thisMonthCount = countBetween(thisMonthStart, now);
  const lastMonthCount = countBetween(lastMonthStart, lastMonthEnd);

  // Quarter over quarter
  const thisQStart = startOfQuarter(now);
  const lastQStart = startOfQuarter(subQuarters(now, 1));
  const lastQEnd = endOfQuarter(subQuarters(now, 1));
  const thisQCount = countBetween(thisQStart, now);
  const lastQCount = countBetween(lastQStart, lastQEnd);

  // 6 month chart
  const monthly = Array.from({ length: 6 }, (_, i) => {
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quote Submission Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Metrics */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last 30 Days</p>
              <p className="text-2xl font-bold">{last30}</p>
              <ChangeBadge value={pctChange(last30, prev30)} />
              <p className="text-xs text-muted-foreground">vs prior 30d ({prev30})</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last 60 Days</p>
              <p className="text-2xl font-bold">{last60}</p>
              <ChangeBadge value={pctChange(last60, prev60)} />
              <p className="text-xs text-muted-foreground">vs prior 60d ({prev60})</p>
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

          {/* Chart */}
          <div className="lg:col-span-3 h-[180px]">
            <p className="text-xs text-muted-foreground mb-2">Last 6 months</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
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
                  {monthly.map((m, i) => (
                    <Cell key={i} fill={m.isCurrent ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
