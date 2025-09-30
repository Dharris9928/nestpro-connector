import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

const Activities = () => {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>(() => {
    // Default to current month
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    };
  });

  const { data: activities, isLoading } = useQuery({
    queryKey: ["activities", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_activities")
        .select("*, companies(company_name), contacts(first_name, last_name)")
        .or(`completed_date.gte.${dateRange.from.toISOString()},scheduled_date.gte.${dateRange.from.toISOString()}`)
        .or(`completed_date.lte.${dateRange.to.toISOString()},scheduled_date.lte.${dateRange.to.toISOString()}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return dateRange.from.getMonth() === now.getMonth() && 
           dateRange.from.getFullYear() === now.getFullYear();
  }, [dateRange]);

  const resetToCurrentMonth = () => {
    const now = new Date();
    setDateRange({
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    });
  };

  const dateRangeText = `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activities</h1>
          <p className="text-muted-foreground">
            Outreach activities {isCurrentMonth ? "for current month" : `from ${dateRangeText}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isCurrentMonth && (
            <Button variant="outline" onClick={resetToCurrentMonth}>
              Current Month
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Date Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange(prev => ({ 
                      ...prev, 
                      to: new Date(date.setHours(23, 59, 59, 999))
                    }))}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading activities...</p>
      ) : !activities || activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">No activities recorded this month</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {activity.activity_type} - {activity.companies?.company_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activity.contacts && (
                    <p className="text-sm text-muted-foreground">
                      Contact: {activity.contacts.first_name} {activity.contacts.last_name}
                    </p>
                  )}
                  {activity.subject_line && (
                    <p className="text-sm font-medium">{activity.subject_line}</p>
                  )}
                  {activity.outcome && (
                    <p className="text-sm">
                      <span className="font-medium">Outcome:</span> {activity.outcome}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Activities;
