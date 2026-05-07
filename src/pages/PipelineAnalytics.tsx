import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerspectiveSelector, Perspective } from "@/components/common/PerspectiveSelector";
import { usePerspective } from "@/hooks/usePerspective";
import { usePipelineAnalytics, getDatePreset } from "@/hooks/usePipelineAnalytics";
import { PipelineKPICards } from "@/components/pipeline/PipelineKPICards";
import { PipelineFunnelChart } from "@/components/pipeline/PipelineFunnelChart";
import { EmailPerformanceCard } from "@/components/pipeline/EmailPerformanceCard";
import { MeetingAnalyticsCard } from "@/components/pipeline/MeetingAnalyticsCard";
import { LeadHandoffCard } from "@/components/pipeline/LeadHandoffCard";
import { ClosedDealsCard } from "@/components/pipeline/ClosedDealsCard";
import { RegionToggle, RegionFilter } from "@/components/pipeline/RegionToggle";
import { CommunicationsFunnel } from "@/components/communications/CommunicationsFunnel";
import { RegionComparisonCard } from "@/components/pipeline/RegionComparisonCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getQuarterOptions } from "@/lib/dates/quarterUtils";

type DatePreset = "this_week" | "this_month" | "last_30" | "last_90" | "custom" | string;
type ViewTab = "analytics" | "comparison";

export default function PipelineAnalytics() {
  const [userId, setUserId] = useState<string>();
  const { perspective, setPerspective } = usePerspective("my_records", "activities");
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30");
  const [dateRange, setDateRange] = useState(() => getDatePreset("last_30"));
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [viewTab, setViewTab] = useState<ViewTab>("analytics");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  const { data: metrics, isLoading } = usePipelineAnalytics(dateRange, perspective, userId, regionFilter, viewTab === "analytics");
  
  // Fetch both regions for comparison tab
  const { data: westMetrics, isLoading: isLoadingWest } = usePipelineAnalytics(dateRange, perspective, userId, "west", viewTab === "comparison");
  const { data: eastMetrics, isLoading: isLoadingEast } = usePipelineAnalytics(dateRange, perspective, userId, "east", viewTab === "comparison");

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["pipeline-analytics"] });
    setTimeout(() => setIsRefreshing(false), 500);
  };
  const handlePresetChange = (preset: DatePreset) => {
    if (preset !== "custom") {
      // Check if it's a quarter preset
      const quarterMatch = quarterOptions.find(q => q.value === preset);
      if (quarterMatch) {
        setDatePreset(preset);
        setDateRange({ from: quarterMatch.from, to: quarterMatch.to });
      } else {
        setDatePreset(preset);
        setDateRange(getDatePreset(preset as any));
      }
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

  const quarterOptions = getQuarterOptions();

  const presets: { label: string; value: DatePreset }[] = [
    { label: "This Week", value: "this_week" },
    { label: "This Month", value: "this_month" },
    { label: "Last 30 Days", value: "last_30" },
    { label: "Last 90 Days", value: "last_90" },
    ...quarterOptions.map(q => ({ label: q.label, value: q.value })),
  ];

  const getRegionLabel = () => {
    if (regionFilter === "west") return " — West Coast";
    if (regionFilter === "east") return " — East Coast";
    return "";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Analytics{getRegionLabel()}</h1>
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
            <PopoverContent className="w-auto p-0 z-50" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => handleDateRangeChange(range || {})}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Tabs and Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as ViewTab)}>
          <TabsList>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="comparison">East vs West</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <RegionToggle value={regionFilter} onChange={setRegionFilter} />
          <PerspectiveSelector
            value={perspective}
            onChange={setPerspective}
          />
        </div>
      </div>

      {viewTab === "analytics" ? (
        <>
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

          {/* Communications Funnel - now with same filters */}
          <CommunicationsFunnel 
            dateRange={dateRange}
            perspective={perspective}
            userId={userId}
            regionFilter={regionFilter}
            metrics={metrics}
          />
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* West Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-lg font-semibold text-purple-600">🟣 West Coast</span>
            </div>
            <PipelineKPICards metrics={westMetrics} isLoading={isLoadingWest} />
            <PipelineFunnelChart metrics={westMetrics} isLoading={isLoadingWest} regionLabel="West" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EmailPerformanceCard metrics={westMetrics} isLoading={isLoadingWest} />
              <MeetingAnalyticsCard metrics={westMetrics} isLoading={isLoadingWest} />
              <LeadHandoffCard metrics={westMetrics} isLoading={isLoadingWest} />
              <ClosedDealsCard metrics={westMetrics} isLoading={isLoadingWest} />
            </div>
          </div>
          
          {/* East Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-lg font-semibold text-blue-600">🔵 East Coast</span>
            </div>
            <PipelineKPICards metrics={eastMetrics} isLoading={isLoadingEast} />
            <PipelineFunnelChart metrics={eastMetrics} isLoading={isLoadingEast} regionLabel="East" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EmailPerformanceCard metrics={eastMetrics} isLoading={isLoadingEast} />
              <MeetingAnalyticsCard metrics={eastMetrics} isLoading={isLoadingEast} />
              <LeadHandoffCard metrics={eastMetrics} isLoading={isLoadingEast} />
              <ClosedDealsCard metrics={eastMetrics} isLoading={isLoadingEast} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
