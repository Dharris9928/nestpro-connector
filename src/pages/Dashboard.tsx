import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Activity, TrendingUp, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Real-time subscription for dashboard updates
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'companies' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["companies-count"] });
          queryClient.invalidateQueries({ queryKey: ["companies-by-status"] });
          queryClient.invalidateQueries({ queryKey: ["companies-by-priority"] });
          queryClient.invalidateQueries({ queryKey: ["recent-companies"] });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'outreach_activities' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activities-count"] });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["contacts-count"] });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pilot_programs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pilot-programs-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: companiesCount } = useQuery({
    queryKey: ["companies-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: contactsCount } = useQuery({
    queryKey: ["contacts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: activitiesCount } = useQuery({
    queryKey: ["activities-count"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("outreach_activities")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pilotProgramsCount } = useQuery({
    queryKey: ["pilot-programs-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pilot_programs")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active");
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: companiesByStatus } = useQuery({
    queryKey: ["companies-by-status"],
    queryFn: async () => {
      const statuses: Array<'Lead' | 'Contacted' | 'Engaged' | 'Pilot' | 'Active'> = ['Lead', 'Contacted', 'Engaged', 'Pilot', 'Active'];
      const results = await Promise.all(
        statuses.map(async (status) => {
          const { count, error } = await supabase
            .from("companies")
            .select("*", { count: "exact", head: true })
            .eq("status", status);
          if (error) throw error;
          return { status, count: count || 0 };
        })
      );
      return results;
    },
  });

  const { data: companiesByPriority } = useQuery({
    queryKey: ["companies-by-priority"],
    queryFn: async () => {
      const priorities: Array<'P1: 80-100' | 'P2: 60-79' | 'P3: 40-59'> = ['P1: 80-100', 'P2: 60-79', 'P3: 40-59'];
      const results = await Promise.all(
        priorities.map(async (priority) => {
          const { count, error } = await supabase
            .from("companies")
            .select("*", { count: "exact", head: true })
            .eq("priority_tier", priority);
          if (error) throw error;
          return { priority, count: count || 0 };
        })
      );
      return results;
    },
  });

  const { data: recentCompanies } = useQuery({
    queryKey: ["recent-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const getPriorityColor = (tier: string) => {
    if (tier?.includes("P1")) return "bg-priority-p1 text-priority-p1-foreground";
    if (tier?.includes("P2")) return "bg-priority-p2 text-priority-p2-foreground";
    if (tier?.includes("P3")) return "bg-priority-p3 text-priority-p3-foreground";
    return "bg-muted";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Google Nest Pro channel management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pipeline Summary Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/companies')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Summary</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companiesCount} Companies</div>
            <div className="mt-4 space-y-2">
              {companiesByStatus?.map((item) => (
                <div
                  key={item.status}
                  className="flex justify-between cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/companies?status=${item.status}`);
                  }}
                >
                  <span className="text-sm text-muted-foreground">{item.status}</span>
                  <span className="text-sm font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/companies')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companiesByPriority?.reduce((sum, item) => sum + item.count, 0) || 0} Total
            </div>
            <div className="mt-4 space-y-2">
              {companiesByPriority?.map((item) => (
                <div
                  key={item.priority}
                  className="flex justify-between cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/companies?priority=${item.priority}`);
                  }}
                >
                  <span className="text-sm text-muted-foreground">{item.priority.split(":")[0]}</span>
                  <span className="text-sm font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* This Month's Activities Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/activities')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month's Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activitiesCount}</div>
            <p className="text-xs text-muted-foreground mt-2">Outreach touchpoints</p>
          </CardContent>
        </Card>

        {/* Active Pilot Programs Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/reports')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pilot Programs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pilotProgramsCount}</div>
            <p className="text-xs text-muted-foreground mt-2">Current pilot programs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentCompanies || recentCompanies.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No companies yet. Add your first company to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{company.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.builder_segment || company.contractor_segment}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {company.priority_tier && (
                        <Badge className={getPriorityColor(company.priority_tier)}>
                          {company.priority_tier.split(":")[0]}
                        </Badge>
                      )}
                      <Badge variant="outline">{company.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Segment analytics will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
