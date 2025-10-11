import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertTriangle, Users, Clock, Database, Activity, FileText, Eye, UserCheck, FileDown } from "lucide-react";
import { toast } from "sonner";
import { ContactAccessLogsViewer } from "./audit/ContactAccessLogsViewer";
import { ApprovalAuditViewer } from "./audit/ApprovalAuditViewer";
import { ImportExportLogsViewer } from "./audit/ImportExportLogsViewer";
import { ComprehensiveAuditViewer } from "./audit/ComprehensiveAuditViewer";
import { AuthEventsLog } from "./audit/AuthEventsLog";
import { ActiveSessionsManager } from "./ActiveSessionsManager";

export function SecurityDashboard() {
  // Fetch security monitoring dashboard
  const { data: securityStats, isLoading } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_monitoring_dashboard' as any)
        .select('*')
        .single();
      
      if (error) throw error;
      return data as any;
    }
  });

  // Fetch unreviewed bulk access alerts
  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['bulk-access-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unreviewed_bulk_alerts' as any);
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch user departures
  const { data: departures } = useQuery({
    queryKey: ['user-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_departures' as any)
        .select('*')
        .order('departure_date', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const handleMarkAlertReviewed = async (alertId: string) => {
    try {
      const { error } = await supabase.rpc('mark_alert_reviewed' as any, {
        _alert_id: alertId,
        _notes: 'Reviewed by admin'
      });

      if (error) throw error;
      
      toast.success('Alert marked as reviewed');
      refetchAlerts();
    } catch (error) {
      console.error('Error marking alert as reviewed:', error);
      toast.error('Failed to mark alert as reviewed');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Dashboard</CardTitle>
          <CardDescription>Loading security metrics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview">
          <Shield className="h-4 w-4 mr-2" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="sessions">
          <Activity className="h-4 w-4 mr-2" />
          Sessions
        </TabsTrigger>
        <TabsTrigger value="audit-trail">
          <Database className="h-4 w-4 mr-2" />
          Audit Trail
        </TabsTrigger>
        <TabsTrigger value="auth-events">
          <Shield className="h-4 w-4 mr-2" />
          Auth Events
        </TabsTrigger>
        <TabsTrigger value="contact-access">
          <Eye className="h-4 w-4 mr-2" />
          Contact Access
        </TabsTrigger>
        <TabsTrigger value="approvals">
          <UserCheck className="h-4 w-4 mr-2" />
          Approvals
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Security Monitoring Dashboard</CardTitle>
              </div>
              <CardDescription>
                Real-time security metrics and alerts for your CRM
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Unreviewed Alerts */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <Badge variant={securityStats?.unreviewed_alerts > 0 ? "destructive" : "secondary"}>
                  {securityStats?.unreviewed_alerts || 0}
                </Badge>
              </div>
              <h3 className="font-semibold">Unreviewed Alerts</h3>
              <p className="text-sm text-muted-foreground">Bulk access alerts pending review</p>
            </div>

            {/* Expired Roles */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-warning" />
                <Badge variant={securityStats?.expired_roles > 0 ? "destructive" : "secondary"}>
                  {securityStats?.expired_roles || 0}
                </Badge>
              </div>
              <h3 className="font-semibold">Expired Roles</h3>
              <p className="text-sm text-muted-foreground">User roles pending cleanup</p>
            </div>

            {/* Active Users (24h) */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-primary" />
                <Badge variant="secondary">{securityStats?.active_users_24h || 0}</Badge>
              </div>
              <h3 className="font-semibold">Active Users</h3>
              <p className="text-sm text-muted-foreground">Last 24 hours</p>
            </div>

            {/* Contact Access (24h) */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-5 w-5 text-primary" />
                <Badge variant="secondary">{securityStats?.contacts_accessed_24h || 0}</Badge>
              </div>
              <h3 className="font-semibold">Contact Access</h3>
              <p className="text-sm text-muted-foreground">Last 24 hours</p>
            </div>

            {/* Frozen Users */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Database className="h-5 w-5 text-info" />
                <Badge variant="secondary">{securityStats?.frozen_users || 0}</Badge>
              </div>
              <h3 className="font-semibold">Data Freeze Active</h3>
              <p className="text-sm text-muted-foreground">Departing employees</p>
            </div>

            {/* Pending Approvals */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-warning" />
                <Badge variant={securityStats?.pending_approvals > 0 ? "destructive" : "secondary"}>
                  {securityStats?.pending_approvals || 0}
                </Badge>
              </div>
              <h3 className="font-semibold">Pending Approvals</h3>
              <p className="text-sm text-muted-foreground">Users awaiting approval</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Access Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Access Alerts</CardTitle>
            <CardDescription>
              Users who have accessed large numbers of contacts recently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <Alert key={alert.alert_id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          User accessed {alert.record_count} contacts
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {alert.alert_type} on {alert.table_name} • 
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleMarkAlertReviewed(alert.alert_id)}
                      >
                        Mark Reviewed
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Departures */}
      {departures && departures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Freeze Active</CardTitle>
            <CardDescription>
              Users with active data freeze due to departure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {departures.map((departure: any) => (
                <div
                  key={departure.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold">User ID: {departure.user_id.substring(0, 8)}...</p>
                    <p className="text-sm text-muted-foreground">
                      Departure Date: {new Date(departure.departure_date).toLocaleDateString()}
                    </p>
                    {departure.notes && (
                      <p className="text-sm text-muted-foreground">Notes: {departure.notes}</p>
                    )}
                  </div>
                  <Badge variant={departure.data_freeze_enabled ? "secondary" : "outline"}>
                    {departure.data_freeze_enabled ? 'Frozen' : 'Not Frozen'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Security Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Security Tasks</CardTitle>
          <CardDescription>
            Background jobs running to maintain security and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 border-b">
              <div>
                <p className="font-medium">Revoke Expired Access</p>
                <p className="text-sm text-muted-foreground">Daily at 2:00 AM</p>
              </div>
              <Badge variant="secondary">Scheduled</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border-b">
              <div>
                <p className="font-medium">Cleanup Old Records</p>
                <p className="text-sm text-muted-foreground">Weekly (Sunday) at 3:00 AM</p>
              </div>
              <Badge variant="secondary">Scheduled</Badge>
            </div>
            <div className="flex items-center justify-between p-2 border-b">
              <div>
                <p className="font-medium">Anonymize Old IP Addresses</p>
                <p className="text-sm text-muted-foreground">Monthly (1st) at 4:00 AM</p>
              </div>
              <Badge variant="secondary">Scheduled</Badge>
            </div>
            <div className="flex items-center justify-between p-2">
              <div>
                <p className="font-medium">Cleanup Rate Limit Tracking</p>
                <p className="text-sm text-muted-foreground">Hourly</p>
              </div>
              <Badge variant="secondary">Scheduled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="sessions">
        <ActiveSessionsManager />
      </TabsContent>

      <TabsContent value="audit-trail">
        <ComprehensiveAuditViewer />
      </TabsContent>

      <TabsContent value="auth-events">
        <AuthEventsLog />
      </TabsContent>

      <TabsContent value="contact-access">
        <ContactAccessLogsViewer />
      </TabsContent>

      <TabsContent value="approvals">
        <ApprovalAuditViewer />
      </TabsContent>
    </Tabs>
  );
}
