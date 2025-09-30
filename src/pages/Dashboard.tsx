import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Activity, TrendingUp, Target, Mail, Phone, Linkedin, Info, Plus, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { AddActivityDialog } from "@/components/activities/AddActivityDialog";
import { SegmentPerformanceGrid } from "@/components/dashboard/SegmentPerformanceGrid";

const Dashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);

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
          queryClient.invalidateQueries({ queryKey: ["pipeline-value"] });
          queryClient.invalidateQueries({ queryKey: ["segment-performance"] });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'outreach_activities' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["monthly-activities"] });
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
          queryClient.invalidateQueries({ queryKey: ["pipeline-value"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const companiesCount = useQuery({
    queryKey: ["companies-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const contactsCount = useQuery({
    queryKey: ["contacts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const monthlyActivitiesQuery = useQuery({
    queryKey: ["monthly-activities"],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from("outreach_activities")
        .select("*")
        .or(`completed_date.gte.${firstDay.toISOString()},scheduled_date.gte.${firstDay.toISOString()}`)
        .or(`completed_date.lte.${lastDay.toISOString()},scheduled_date.lte.${lastDay.toISOString()}`);
      if (error) throw error;
      return data || [];
    },
  });

  const monthlyActivities = monthlyActivitiesQuery.data;

  const activityStats = useMemo(() => {
    if (!monthlyActivities) return {
      completed: 0,
      scheduled: 0,
      byType: { Email: 0, Phone: 0, LinkedIn: 0 }
    };

    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const completed = monthlyActivities.filter(a => 
      a.completed_date && a.outcome === 'Completed'
    ).length;

    const scheduled = monthlyActivities.filter(a => 
      a.scheduled_date && 
      new Date(a.scheduled_date) > now &&
      new Date(a.scheduled_date) <= endOfMonth
    ).length;

    const byType = {
      Email: monthlyActivities.filter(a => a.activity_type === 'Email').length,
      Phone: monthlyActivities.filter(a => a.activity_type === 'Phone').length,
      LinkedIn: monthlyActivities.filter(a => 
        a.activity_type === 'LinkedIn Connection' || 
        a.activity_type === 'LinkedIn Message'
      ).length
    };

    return { completed, scheduled, byType };
  }, [monthlyActivities]);

  const monthProgress = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const percentage = Math.round((currentDay / daysInMonth) * 100);
    return { currentDay, daysInMonth, percentage };
  }, []);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString("en-US", { 
      month: "long", 
      year: "numeric" 
    });
  }, []);

  const pilotProgramsCount = useQuery({
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

  const pipelineData = useQuery({
    queryKey: ["pipeline-value"],
    queryFn: async () => {
      const OPEN_STATUSES: Array<'Lead' | 'Contacted' | 'Engaged' | 'Pilot'> = ['Lead', 'Contacted', 'Engaged', 'Pilot'];
      
      // Get all companies with open status
      const { data: openCompanies, error: companiesError } = await supabase
        .from("companies")
        .select("id, status, annual_revenue_range")
        .in("status", OPEN_STATUSES);
      
      if (companiesError) throw companiesError;
      if (!openCompanies) return { totalValue: 0, byStatus: {} };

      const companyIds = openCompanies.map(c => c.id);
      
      // Get pilot programs for these companies
      const { data: pilots, error: pilotsError } = await supabase
        .from("pilot_programs")
        .select("company_id, target_installations, status")
        .in("company_id", companyIds)
        .in("status", ['Proposed', 'Approved', 'Active']);
      
      if (pilotsError) throw pilotsError;

      // Revenue estimates for companies without pilots
      const revenueEstimates: Record<string, number> = {
        '<$500K': 5000,
        '$500K-$999K': 10000,
        '$1M-$2.9M': 20000,
        '$3M-$5.9M': 35000,
        '$6M-$10M': 50000,
        '$10M+': 75000
      };

      let totalPipelineValue = 0;
      const byStatus: Record<string, number> = {
        'Lead': 0,
        'Contacted': 0,
        'Engaged': 0,
        'Pilot': 0
      };

      openCompanies.forEach(company => {
        const companyPilots = pilots?.filter(p => p.company_id === company.id) || [];
        let companyValue = 0;

        if (companyPilots.length > 0) {
          // Sum pilot program values ($200 per installation)
          companyPilots.forEach(pilot => {
            companyValue += (pilot.target_installations || 0) * 200;
          });
        } else {
          // Estimate based on company revenue range
          companyValue = revenueEstimates[company.annual_revenue_range || ''] || 10000;
        }

        totalPipelineValue += companyValue;
        byStatus[company.status] += companyValue;
      });

      return { totalValue: totalPipelineValue, byStatus };
    },
  });

  const pipelineValue = pipelineData.data?.totalValue || 0;
  const pipelineByStatus = pipelineData.data?.byStatus || {};

  const companiesByStatus = useQuery({
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

  const companiesByPriority = useQuery({
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

  const recentCompaniesQuery = useQuery({
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

  const recentCompanies = recentCompaniesQuery.data;

  const getPriorityColor = (tier: string) => {
    if (tier?.includes("P1")) return "bg-priority-p1 text-priority-p1-foreground";
    if (tier?.includes("P2")) return "bg-priority-p2 text-priority-p2-foreground";
    if (tier?.includes("P3")) return "bg-priority-p3 text-priority-p3-foreground";
    return "bg-muted";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Google Nest Pro channel management
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsAddCompanyOpen(true)}>
              <Building2 className="h-4 w-4 mr-2" />
              Add Company
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsAddActivityOpen(true)}>
              <Activity className="h-4 w-4 mr-2" />
              Log Activity
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/contacts')}>
              <Users className="h-4 w-4 mr-2" />
              Add Contact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pipeline Summary Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all duration-200"
          onClick={() => navigate('/companies')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Summary</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {companiesCount.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : companiesCount.isError ? (
              <div className="space-y-2">
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">Failed to load companies</AlertDescription>
                </Alert>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); companiesCount.refetch(); }}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold animate-in fade-in duration-300">{companiesCount.data} Companies</div>
                <div className="mt-4 space-y-2">
                  {companiesByStatus.isLoading ? (
                    <>
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </>
                  ) : (
                    companiesByStatus.data?.map((item) => (
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
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all duration-200"
          onClick={() => navigate('/companies')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {companiesByPriority.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : companiesByPriority.isError ? (
              <div className="space-y-2">
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">Failed to load priorities</AlertDescription>
                </Alert>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); companiesByPriority.refetch(); }}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold animate-in fade-in duration-300">
                  {companiesByPriority.data?.reduce((sum, item) => sum + item.count, 0) || 0} Total
                </div>
                <div className="mt-4 space-y-2">
                  {companiesByPriority.data?.map((item) => (
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
              </>
            )}
          </CardContent>
        </Card>

        {/* This Month's Activities Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all duration-200 col-span-1 lg:col-span-2"
          onClick={() => navigate('/activities')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">This Month's Activities</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{currentMonthName}</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{activityStats.completed}</p>
                  <p className="text-xs text-muted-foreground">Activities completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{activityStats.scheduled}</p>
                  <p className="text-xs text-muted-foreground">Scheduled upcoming</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Breakdown:</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Emails</span>
                    </div>
                    <span className="font-semibold">{activityStats.byType.Email}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Calls</span>
                    </div>
                    <span className="font-semibold">{activityStats.byType.Phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">LinkedIn</span>
                    </div>
                    <span className="font-semibold">{activityStats.byType.LinkedIn}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Month Progress</span>
                  <span className="text-muted-foreground">
                    Day {monthProgress.currentDay}/{monthProgress.daysInMonth}
                  </span>
                </div>
                <Progress value={monthProgress.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{monthProgress.percentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Value & Pilot Programs Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all duration-200 col-span-1 lg:col-span-2"
          onClick={() => navigate('/reports')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Pipeline Value & Pilots</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">All open opportunities</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {pipelineData.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : pipelineData.isError ? (
              <div className="space-y-2">
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">Failed to load pipeline data</AlertDescription>
                </Alert>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); pipelineData.refetch(); }}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-bold animate-in fade-in duration-300">
                        ${pipelineValue.toLocaleString()}
                      </p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">
                              Pipeline value includes estimated revenue from all companies in 
                              Lead, Contacted, Engaged, and Pilot status. Active companies 
                              (closed won) and Lost/Inactive companies (closed lost) are not included.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground">Pipeline Value</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold animate-in fade-in duration-300">{pilotProgramsCount.data}</p>
                    <p className="text-xs text-muted-foreground">Active Pilots</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Breakdown by Status:</p>
                  <div className="space-y-1">
                    {Object.entries(pipelineByStatus).map(([status, value]) => {
                      const percentage = pipelineValue > 0 
                        ? Math.round((value / pipelineValue) * 100) 
                        : 0;
                      return (
                        <div
                          key={status}
                          className="flex items-center justify-between text-sm cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/companies?status=${status}`);
                          }}
                        >
                          <span className="text-muted-foreground">{status}</span>
                          <span className="font-semibold">
                            ${value.toLocaleString()} ({percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    💡 Includes: Lead, Contacted, Engaged, Pilot statuses. 
                    Excludes: Active (won), Lost/Inactive (closed).
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Total Contacts Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all duration-200"
          onClick={() => navigate('/contacts')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {contactsCount.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : contactsCount.isError ? (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">Failed to load contacts</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="text-2xl font-bold animate-in fade-in duration-300">{contactsCount.data}</div>
                <p className="text-xs text-muted-foreground mt-2">Decision makers tracked</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCompaniesQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentCompaniesQuery.isError ? (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">Failed to load recent companies</AlertDescription>
              </Alert>
            ) : !recentCompanies || recentCompanies.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No companies yet. Add your first company to get started!</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                {recentCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-all duration-200"
                    onClick={() => navigate(`/companies`)}
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

      <SegmentPerformanceGrid />

      <AddCompanyDialog
        open={isAddCompanyOpen}
        onOpenChange={setIsAddCompanyOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["companies-count"] });
          queryClient.invalidateQueries({ queryKey: ["companies-by-status"] });
          queryClient.invalidateQueries({ queryKey: ["companies-by-priority"] });
          queryClient.invalidateQueries({ queryKey: ["recent-companies"] });
          queryClient.invalidateQueries({ queryKey: ["pipeline-value"] });
          queryClient.invalidateQueries({ queryKey: ["segment-performance"] });
          setIsAddCompanyOpen(false);
        }}
      />

      <AddActivityDialog
        open={isAddActivityOpen}
        onOpenChange={setIsAddActivityOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["monthly-activities"] });
          setIsAddActivityOpen(false);
        }}
      />
    </div>
  );
};

export default Dashboard;
