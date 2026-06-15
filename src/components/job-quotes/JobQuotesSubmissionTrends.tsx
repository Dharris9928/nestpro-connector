import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";
import { startOfWeek, endOfWeek, subWeeks, format, eachDayOfInterval, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";

interface Row {
  date_received: string;
  status: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--warning))",
  won: "hsl(var(--success))",
  lost: "hsl(var(--destructive))",
};

export function JobQuotesSubmissionTrends() {
  const { data: rows = [] } = useQuery({
    queryKey: ["job-quotes-submission-trends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_quotes")
        .select("date_received, status")
        .not("date_received", "is", null);
      if (error) throw error;
      return (data || []) as unknown as Row[];
    },
  });

  const now = new Date();

  // Weekly submissions — last 12 weeks, stacked by status
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const ref = subWeeks(now, 11 - i);
    const start = startOfWeek(ref, { weekStartsOn: 1 });
    const end = endOfWeek(ref, { weekStartsOn: 1 });
    const inWeek = rows.filter((r) => {
      const d = new Date(r.date_received);
      return d >= start && d <= end;
    });
    return {
      label: format(start, "MMM d"),
      pending: inWeek.filter((r) => r.status === "pending").length,
      won: inWeek.filter((r) => r.status === "won").length,
      lost: inWeek.filter((r) => r.status === "lost").length,
      total: inWeek.length,
    };
  });

  // Day-of-week submission pattern — last 90 days
  const ninetyDaysAgo = subDays(now, 90);
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  rows.forEach((r) => {
    const d = new Date(r.date_received);
    if (d >= ninetyDaysAgo && d <= now) {
      dowCounts[d.getDay()]++;
    }
  });
  const dowData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, i) => ({
    label,
    count: dowCounts[i],
  }));

  // Daily submissions — last 30 days
  const daily = eachDayOfInterval({ start: subDays(now, 29), end: now }).map((d) => {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const count = rows.filter((r) => {
      const rd = new Date(r.date_received);
      return rd >= dayStart && rd <= dayEnd;
    }).length;
    return { label: format(d, "M/d"), count };
  });

  const tooltipStyle = {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 6,
    fontSize: 12,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          Submission Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly stacked by status */}
          <div className="h-[240px]">
            <p className="text-xs text-muted-foreground mb-2">
              Weekly submissions by status — last 12 weeks
            </p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pending" stackId="a" fill={STATUS_COLORS.pending} name="Pending" />
                <Bar dataKey="won" stackId="a" fill={STATUS_COLORS.won} name="Won" />
                <Bar dataKey="lost" stackId="a" fill={STATUS_COLORS.lost} name="Lost" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily — last 30 days */}
          <div className="h-[240px]">
            <p className="text-xs text-muted-foreground mb-2">
              Daily submissions — last 30 days
            </p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={2} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={tooltipStyle}
                  formatter={(value: any) => [`${value} quotes`, "Submitted"]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Day of week — last 90 days */}
          <div className="h-[200px] lg:col-span-2">
            <p className="text-xs text-muted-foreground mb-2">
              Submission pattern by day of week — last 90 days
            </p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} fontSize={11} width={40} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={tooltipStyle}
                  formatter={(value: any) => [`${value} quotes`, "Submitted"]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
