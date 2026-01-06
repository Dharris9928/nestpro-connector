import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PerspectiveSelector, Perspective } from "@/components/common/PerspectiveSelector";
import { usePerspective } from "@/hooks/usePerspective";
import { usePipelineAnalytics, getDatePreset } from "@/hooks/usePipelineAnalytics";
import { PipelineKPICards } from "@/components/pipeline/PipelineKPICards";
import { PipelineFunnelChart } from "@/components/pipeline/PipelineFunnelChart";
import { EmailPerformanceCard } from "@/components/pipeline/EmailPerformanceCard";
import { MeetingAnalyticsCard } from "@/components/pipeline/MeetingAnalyticsCard";
import { LeadHandoffCard } from "@/components/pipeline/LeadHandoffCard";
import { ClosedDealsCard } from "@/components/pipeline/ClosedDealsCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type DatePreset = "this_week" | "this_month" | "last_30" | "last_90" | "custom";

export default function PipelineAnalytics() {
  const [userId, setUserId] = useState<string>();
  const { perspective, setPerspective } = usePerspective("my_records", "activities");
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30");
  const [dateRange, setDateRange] = useState(() => getDatePreset("last_30"));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  const { data: metrics, isLoading } = usePipelineAnalytics(dateRange, perspective, userId);

  const handlePresetChange = (preset: DatePreset) => {
    if (preset !== "custom") {
      setDatePreset(preset);
      setDateRange(getDatePreset(preset));
    } else {
      setDatePreset("custom");
    }
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
      setDatePreset("custom");
    } else if (range.from) {
      setDateRange({ from: range.from, to: range.from });
      setDatePreset("custom");
    }
  };

  const presets: { label: string; value: DatePreset }[] = [
    { label: "This Week", value: "this_week" },
    { label: "This Month", value: "this_month" },
    { label: "Last 30 Days", value: "last_30" },
    { label: "Last 90 Days", value: "last_90" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Analytics</h1>
          <p className="text-muted-foreground">
            Track your sales pipeline from outreach to lead handoff
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Presets */}
          <div className="flex gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={datePreset === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={datePreset === "custom" ? "default" : "outline"}
                size="sm"
                className={cn("min-w-[200px] justify-start text-left font-normal")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                    <>
                      {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "Pick a date"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => handleDateRangeChange(range || {})}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Perspective Selector */}
          <PerspectiveSelector
            value={perspective}
            onChange={setPerspective}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <PipelineKPICards metrics={metrics} isLoading={isLoading} />

      {/* Funnel Chart */}
      <PipelineFunnelChart metrics={metrics} isLoading={isLoading} />

      {/* Detail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EmailPerformanceCard metrics={metrics} isLoading={isLoading} />
        <MeetingAnalyticsCard metrics={metrics} isLoading={isLoading} />
        <LeadHandoffCard metrics={metrics} isLoading={isLoading} />
        <ClosedDealsCard metrics={metrics} isLoading={isLoading} />
      </div>
    </div>
  );
}
