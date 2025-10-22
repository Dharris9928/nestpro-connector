import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const PermitAlertsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['permit-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_alerts')
        .select(`
          *,
          permit:building_permits(
            id,
            project_name,
            city,
            state,
            num_units,
            estimated_value
          )
        `)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('permit_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-alerts'] });
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as acknowledged"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'large_development': return 'Large Development';
      case 'high_value': return 'High Value';
      case 'known_builder': return 'Known Builder';
      case 'target_market': return 'Target Market';
      default: return type;
    }
  };

  if (isLoading) {
    return <div>Loading alerts...</div>;
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Alerts</CardTitle>
          <CardDescription>
            You'll be notified here when high-value permit opportunities are discovered
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <Card key={alert.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-lg">
                    {alert.permit?.project_name || 'Unknown Project'}
                  </CardTitle>
                </div>
                <CardDescription>
                  {alert.permit?.city}, {alert.permit?.state}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={getPriorityColor(alert.priority)}>
                  {alert.priority}
                </Badge>
                <Badge variant="outline">
                  {getAlertTypeLabel(alert.alert_type)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">{alert.message}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {alert.permit?.num_units && (
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {alert.permit.num_units} units
                  </div>
                )}
                {alert.permit?.estimated_value && (
                  <div>
                    Est. Value: ${(alert.permit.estimated_value / 1000000).toFixed(1)}M
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeMutation.mutate(alert.id)}
                  disabled={acknowledgeMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Acknowledge
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.location.href = `/permits?id=${alert.permit?.id}`}
                >
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
