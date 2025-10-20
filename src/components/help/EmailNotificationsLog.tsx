import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle2, AlertCircle, Clock, ChevronRight, Eye } from "lucide-react";
import { format } from "date-fns";

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_user_id: string | null;
  sender_email: string;
  subject: string;
  email_type: string;
  status: string;
  resend_email_id: string | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  created_at: string;
}

export function EmailNotificationsLog() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data || []) as EmailLog[]);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (log: EmailLog) => {
    switch (log.status.toLowerCase()) {
      case 'sent':
        return (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Sent
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            Delivered
          </Badge>
        );
      case 'opened':
        return (
          <Badge variant="outline" className="gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400">
            <Eye className="h-3 w-3" />
            Opened
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {log.status}
          </Badge>
        );
    }
  };

  const formatEmailType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications Log
          </CardTitle>
          <CardDescription>Loading email logs...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications Log
        </CardTitle>
        <CardDescription>
          System notification emails sent to users (password resets, activity assignments, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No email notifications sent yet
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {log.subject}
                      </span>
                      {getStatusBadge(log)}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span>To: {log.recipient_email}</span>
                        <Badge variant="secondary" className="text-xs">
                          {formatEmailType(log.email_type)}
                        </Badge>
                      </div>
                      
                      {log.delivered_at && (
                        <div className="text-xs">
                          Delivered: {format(new Date(log.delivered_at), 'MMM d, h:mm a')}
                        </div>
                      )}
                      
                      {log.opened_at && (
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          Opened: {format(new Date(log.opened_at), 'MMM d, h:mm a')}
                        </div>
                      )}
                    </div>
                    
                    {log.error_message && (
                      <div className="mt-2">
                        <div 
                          className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive cursor-pointer hover:bg-destructive/20 transition-colors flex items-center justify-between"
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        >
                          <span>Error: {log.error_message}</span>
                          <ChevronRight className={`h-4 w-4 transition-transform ${expandedLogId === log.id ? 'rotate-90' : ''}`} />
                        </div>
                        {expandedLogId === log.id && log.metadata && (
                          <div className="mt-2 p-3 bg-muted border border-border rounded text-xs max-h-64 overflow-y-auto">
                            <pre className="text-muted-foreground font-mono whitespace-pre-wrap">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right text-sm text-muted-foreground">
                  <div>{format(new Date(log.sent_at), 'MMM d, yyyy')}</div>
                  <div className="text-xs">{format(new Date(log.sent_at), 'h:mm a')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
