import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Activity, Download, Eye, FileText, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BulkAccessAlert {
  id: string;
  user_id: string;
  alert_type: string;
  record_count: number;
  table_name: string;
  alert_details: any;
  created_at: string;
  acknowledged_at: string | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface AccessRequest {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string;
  justification: string;
  status: string;
  requested_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface ExportLog {
  id: string;
  user_id: string;
  table_name: string;
  record_count: number;
  export_type: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export function AccessPatternMonitor() {
  const [timeWindow, setTimeWindow] = useState<"1h" | "24h" | "7d">("24h");

  // Fetch bulk access alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["bulk-access-alerts", timeWindow],
    queryFn: async () => {
      const hoursAgo = timeWindow === "1h" ? 1 : timeWindow === "24h" ? 24 : 168;
      const { data, error } = await supabase
        .from("bulk_access_alerts")
        .select("*")
        .gte("created_at", new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Fetch profile data separately
      const userIds = [...new Set(data?.map(a => a.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      return (data || []).map(alert => ({
        ...alert,
        acknowledged_at: alert.reviewed_at,
        profiles: profilesMap.get(alert.user_id) || { first_name: "Unknown", last_name: "User" }
      })) as BulkAccessAlert[];
    },
  });

  // Fetch recent access requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["recent-access-requests", timeWindow],
    queryFn: async () => {
      const hoursAgo = timeWindow === "1h" ? 1 : timeWindow === "24h" ? 24 : 168;
      const { data, error } = await supabase
        .from("record_access_requests")
        .select("*")
        .gte("requested_at", new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString())
        .order("requested_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Fetch profile data separately
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      return (data || []).map(request => ({
        ...request,
        profiles: profilesMap.get(request.user_id) || { first_name: "Unknown", last_name: "User" }
      })) as AccessRequest[];
    },
  });

  // Fetch export activity
  const { data: exports, isLoading: exportsLoading } = useQuery({
    queryKey: ["export-logs", timeWindow],
    queryFn: async () => {
      const hoursAgo = timeWindow === "1h" ? 1 : timeWindow === "24h" ? 24 : 168;
      const { data, error } = await supabase
        .from("export_logs")
        .select("*")
        .gte("created_at", new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Fetch profile data separately
      const userIds = [...new Set(data?.map(e => e.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      return (data || []).map(exp => ({
        ...exp,
        profiles: profilesMap.get(exp.user_id) || { first_name: "Unknown", last_name: "User" }
      })) as ExportLog[];
    },
  });

  const getAlertBadgeVariant = (alertType: string) => {
    if (alertType.includes("BULK") || alertType.includes("EXCESSIVE")) return "destructive";
    if (alertType.includes("REPEATED")) return "destructive";
    return "default";
  };

  const getAlertIcon = (alertType: string) => {
    if (alertType.includes("EXPORT")) return <Download className="h-4 w-4" />;
    if (alertType.includes("ACCESS")) return <Eye className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Access Pattern Monitoring
            </CardTitle>
            <CardDescription>
              Real-time monitoring of user access patterns and security alerts
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge
              variant={timeWindow === "1h" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setTimeWindow("1h")}
            >
              1 Hour
            </Badge>
            <Badge
              variant={timeWindow === "24h" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setTimeWindow("24h")}
            >
              24 Hours
            </Badge>
            <Badge
              variant={timeWindow === "7d" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setTimeWindow("7d")}
            >
              7 Days
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts">
              Security Alerts {alerts && alerts.length > 0 && `(${alerts.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Access Requests {requests && requests.length > 0 && `(${requests.length})`}
            </TabsTrigger>
            <TabsTrigger value="exports">
              Export Activity {exports && exports.length > 0 && `(${exports.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            {alertsLoading ? (
              <p className="text-sm text-muted-foreground">Loading alerts...</p>
            ) : !alerts || alerts.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No security alerts in the selected time window. System is operating normally.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border p-3 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getAlertIcon(alert.alert_type)}
                          <Badge variant={getAlertBadgeVariant(alert.alert_type)}>
                            {alert.alert_type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <strong>User:</strong>{" "}
                          {alert.profiles?.first_name} {alert.profiles?.last_name}
                        </p>
                        <p className="text-sm">
                          <strong>Table:</strong> {alert.table_name}
                        </p>
                        <p className="text-sm">
                          <strong>Count:</strong> {alert.record_count} records
                        </p>
                        {alert.alert_details && (
                          <details className="text-xs text-muted-foreground mt-2">
                            <summary className="cursor-pointer">View Details</summary>
                            <pre className="mt-2 p-2 bg-muted rounded">
                              {JSON.stringify(alert.alert_details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {requestsLoading ? (
              <p className="text-sm text-muted-foreground">Loading requests...</p>
            ) : !requests || requests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No access requests in the selected time window.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request.id} className="border p-3 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={request.status === "pending" ? "default" : "secondary"}>
                          {request.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <strong>User:</strong>{" "}
                          {request.profiles?.first_name} {request.profiles?.last_name}
                        </p>
                        <p className="text-sm">
                          <strong>Resource:</strong> {request.table_name}
                        </p>
                        {request.justification && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <strong>Justification:</strong> {request.justification}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="exports" className="space-y-4">
            {exportsLoading ? (
              <p className="text-sm text-muted-foreground">Loading exports...</p>
            ) : !exports || exports.length === 0 ? (
              <div className="text-center py-8">
                <Download className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No export activity in the selected time window.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {exports.map((exp) => (
                    <div key={exp.id} className="border p-3 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <Badge>{exp.export_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(exp.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <strong>User:</strong>{" "}
                          {exp.profiles?.first_name} {exp.profiles?.last_name}
                        </p>
                        <p className="text-sm">
                          <strong>Table:</strong> {exp.table_name}
                        </p>
                        <p className="text-sm">
                          <strong>Records:</strong> {exp.record_count}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}