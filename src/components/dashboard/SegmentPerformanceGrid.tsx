import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SegmentPerformanceGrid() {
  const navigate = useNavigate();

  const { data: segmentData, isLoading } = useQuery({
    queryKey: ["segment-performance"],
    queryFn: async () => {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("builder_segment, contractor_segment, lead_score, status, industry_type");

      if (error) throw error;
      if (!companies) return {};

      const segments: Record<string, {
        count: number;
        totalScore: number;
        activeCount: number;
        avgScore: number;
        conversionRate: string;
        industry: string;
      }> = {};

      companies.forEach((company) => {
        const segment = company.builder_segment || company.contractor_segment;
        if (!segment) return;

        if (!segments[segment]) {
          segments[segment] = {
            count: 0,
            totalScore: 0,
            activeCount: 0,
            avgScore: 0,
            conversionRate: "0",
            industry: company.industry_type,
          };
        }

        segments[segment].count++;
        segments[segment].totalScore += company.lead_score || 0;
        if (company.status === "Active") {
          segments[segment].activeCount++;
        }
      });

      // Calculate averages and conversion rates
      Object.keys(segments).forEach((segment) => {
        const s = segments[segment];
        s.avgScore = Math.round(s.totalScore / s.count);
        s.conversionRate = ((s.activeCount / s.count) * 100).toFixed(1);
      });

      return segments;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segment Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading segment data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!segmentData || Object.keys(segmentData).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segment Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            No segment data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segment Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(segmentData)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([segment, data]) => (
              <div
                key={segment}
                className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => {
                  const filterKey = data.industry === "Builder" 
                    ? "builder_segment" 
                    : "contractor_segment";
                  navigate(`/companies?${filterKey}=${segment}`);
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{segment}</h3>
                    <p className="text-xs text-muted-foreground">{data.industry}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {data.count} companies
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg Score</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold">{data.avgScore}</span>
                      {data.avgScore >= 70 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-orange-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Conversion</span>
                    <span className="text-sm font-semibold">{data.conversionRate}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <span className="text-sm font-semibold">
                      {data.activeCount} / {data.count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
