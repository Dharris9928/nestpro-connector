import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

const Activities = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("outreach_activities")
        .select("*, companies(company_name), contacts(first_name, last_name)")
        .gte("created_at", startOfMonth.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const currentMonth = new Date().toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activities</h1>
        <p className="text-muted-foreground">
          Outreach activities for {currentMonth}
        </p>
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
