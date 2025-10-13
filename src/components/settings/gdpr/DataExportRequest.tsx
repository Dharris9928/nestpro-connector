import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Download, FileJson, Clock, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ExportRequest {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  file_size_bytes: number | null;
  record_count: any;
  error_message: string | null;
}

export function DataExportRequest() {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  // Fetch export requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['data-export-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExportRequest[];
    },
  });

  // Export data mutation
  const exportData = useMutation({
    mutationFn: async () => {
      setIsExporting(true);
      
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-export-requests'] });
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Data exported successfully', {
        description: 'Your data has been downloaded as a JSON file',
      });
    },
    onError: (error: any) => {
      toast.error('Export failed', {
        description: error.message,
      });
    },
    onSettled: () => {
      setIsExporting(false);
    },
  });

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          <CardTitle>Data Portability</CardTitle>
        </div>
        <CardDescription>
          Export all your data in machine-readable format (GDPR Article 20)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You can request a complete export of your data at any time. The export includes all
            companies, contacts, communications, activities, and audit logs associated with your account.
          </AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button
            onClick={() => exportData.mutate()}
            disabled={isExporting}
            size="lg"
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export My Data'}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-16 bg-muted animate-pulse rounded" />
            <div className="h-16 bg-muted animate-pulse rounded" />
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Export History</h4>
            {requests.slice(0, 5).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <Badge variant={getStatusVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      Requested: {new Date(request.created_at).toLocaleString()}
                    </p>
                    {request.completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Completed: {new Date(request.completed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  {request.file_size_bytes && (
                    <p className="font-medium">{formatFileSize(request.file_size_bytes)}</p>
                  )}
                  {request.record_count && typeof request.record_count === 'object' && (
                    <p className="text-xs text-muted-foreground">
                      {Object.values(request.record_count as Record<string, number>).reduce((a, b) => a + b, 0)} records
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No export history yet. Click "Export My Data" to create your first export.
          </p>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            Exports contain all your personal data in JSON format. Store the file securely and
            delete it when no longer needed. Data exports are generated in real-time and reflect
            the current state of your account.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
