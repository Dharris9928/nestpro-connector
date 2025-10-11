import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Laptop, Smartphone, Monitor, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Session {
  id: string;
  last_activity_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
}

export function ActiveSessionsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['user-sessions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      return data as Session[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const terminateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
      toast({
        title: "Session Terminated",
        description: "The session has been successfully terminated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to terminate session. Please try again.",
        variant: "destructive",
      });
      console.error('Error terminating session:', error);
    },
  });

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Laptop className="h-4 w-4" />;
  };

  const getCurrentSessionToken = () => {
    return sessionStorage.getItem('session_token');
  };

  if (isLoading) {
    return <div>Loading sessions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>
          Manage your active login sessions. You can have up to 3 concurrent sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions && sessions.length > 0 ? (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Sessions timeout after 30 minutes of inactivity
              </span>
            </div>
            {sessions.map((session) => {
              const currentToken = getCurrentSessionToken();
              const isCurrentSession = currentToken && session.id.includes(currentToken.slice(0, 8));
              
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(session.user_agent)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {session.user_agent?.split(' ')[0] || 'Unknown Device'}
                        </p>
                        {isCurrentSession && (
                          <Badge variant="outline" className="text-xs">
                            Current Session
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last active: {format(new Date(session.last_activity_at), 'PPp')}
                      </p>
                      {session.ip_address && (
                        <p className="text-xs text-muted-foreground">
                          IP: {session.ip_address}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => terminateSession.mutate(session.id)}
                    disabled={terminateSession.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No active sessions found.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
