import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { AddActivityDialog } from "@/components/activities/AddActivityDialog";
import { ActivityDetailsDialog } from "@/components/activities/ActivityDetailsDialog";
import { EditActivityDialog } from "@/components/activities/EditActivityDialog";
import { PerspectiveSelector } from "@/components/common/PerspectiveSelector";
import { usePerspective } from "@/hooks/usePerspective";
import { useUserRole } from "@/hooks/useUserRole";

const Activities = () => {
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [followUpActivity, setFollowUpActivity] = useState<any>(null);
  const [editActivity, setEditActivity] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { perspective, setPerspective } = usePerspective('my_records');
  const { data: userRoleData } = useUserRole();
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

  const handleFollowUp = (activity: any) => {
    setFollowUpActivity(activity);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (activity: any) => {
    setEditActivity(activity);
    setIsEditDialogOpen(true);
  };

  const buildFollowUpContext = () => {
    if (!followUpActivity) return undefined;
    
    const contextParts = [
      `Follow-up to previous ${followUpActivity.activity_type}`,
    ];
    
    if (followUpActivity.subject_line) {
      contextParts.push(`Subject: ${followUpActivity.subject_line}`);
    }
    
    if (followUpActivity.message_content) {
      contextParts.push(`Previous Message:\n${followUpActivity.message_content}`);
    }
    
    if (followUpActivity.outcome) {
      contextParts.push(`Outcome: ${followUpActivity.outcome}`);
    }
    
    if (followUpActivity.notes) {
      contextParts.push(`Notes: ${followUpActivity.notes}`);
    }
    
    return contextParts.join('\n\n');
  };

  const { data: activities, isLoading, refetch } = useQuery({
    queryKey: ["activities", dateRange, perspective],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from("outreach_activities")
        .select("*, companies(company_name, created_by, assigned_to), contacts(first_name, last_name)");

      // Apply perspective filter
      if (perspective === 'my_records') {
        query = query.eq('companies.created_by', user.id);
      } else if (perspective === 'assigned_to_me') {
        query = query.eq('companies.assigned_to', user.id);
      } else if (perspective === 'my_team') {
        if (userRoleData?.role === 'sales_manager') {
          const { data: teamMembers } = await supabase
            .from('team_memberships')
            .select('team_member_id')
            .eq('manager_id', user.id)
            .eq('is_active', true);
          
          const teamIds = teamMembers?.map(m => m.team_member_id) || [];
          if (teamIds.length > 0) {
            query = query.in('companies.created_by', teamIds);
          } else {
            query = query.eq('companies.created_by', '00000000-0000-0000-0000-000000000000');
          }
        }
      } else if (perspective === 'all_records' && !userRoleData?.hasElevatedAccess) {
        query = query.eq('companies.created_by', user.id);
      }

      const { data, error } = await query
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
          <PerspectiveSelector value={perspective} onChange={setPerspective} />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Activity
          </Button>
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
            <Card 
              key={activity.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => {
                setSelectedActivity(activity);
                setIsDetailsDialogOpen(true);
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg">
                  {activity.activity_type} - {" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-lg font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/companies', { state: { editCompanyId: activity.company_id } });
                    }}
                  >
                    {activity.companies?.company_name}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activity.contacts && (
                    <p className="text-sm text-muted-foreground">
                      Contact: {" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/contacts', { state: { editContactId: activity.contact_id } });
                        }}
                      >
                        {activity.contacts.first_name} {activity.contacts.last_name}
                      </Button>
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

      <AddActivityDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setFollowUpActivity(null);
        }}
        onSuccess={() => {
          refetch();
          setIsAddDialogOpen(false);
          setFollowUpActivity(null);
        }}
        companyId={followUpActivity?.company_id}
        companyName={followUpActivity?.companies?.company_name}
        contactId={followUpActivity?.contact_id}
        followUpContext={buildFollowUpContext()}
      />

      <ActivityDetailsDialog
        activity={selectedActivity}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onFollowUp={handleFollowUp}
        onEdit={handleEdit}
      />

      <EditActivityDialog
        activity={editActivity}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          refetch();
          setIsEditDialogOpen(false);
          setEditActivity(null);
        }}
      />
    </div>
  );
};

export default Activities;
