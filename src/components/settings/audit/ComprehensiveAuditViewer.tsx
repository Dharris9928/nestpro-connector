import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Search, FileEdit, Trash2, Eye, Plus } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string | null;
  table_name: string;
  record_id: string | null;
  operation: string;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function ComprehensiveAuditViewer() {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', tableFilter, operationFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      if (operationFilter !== 'all') {
        query = query.eq('operation', operationFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Plus className="h-4 w-4" />;
      case 'UPDATE':
        return <FileEdit className="h-4 w-4" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4" />;
      case 'SELECT':
        return <Eye className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'default';
      case 'UPDATE':
        return 'secondary';
      case 'DELETE':
        return 'destructive';
      case 'SELECT':
        return 'outline';
      default:
        return 'default';
    }
  };

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.table_name.toLowerCase().includes(search) ||
      log.operation.toLowerCase().includes(search) ||
      log.record_id?.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return <div>Loading audit logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comprehensive Audit Trail</CardTitle>
        <CardDescription>
          Complete history of all data changes across the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by table, operation, or record ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              <SelectItem value="companies">Companies</SelectItem>
              <SelectItem value="contacts">Contacts</SelectItem>
              <SelectItem value="company_communications">Communications</SelectItem>
            </SelectContent>
          </Select>
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Operation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Operations</SelectItem>
              <SelectItem value="INSERT">Insert</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="SELECT">Select</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Logs */}
        <div className="space-y-2">
          {filteredLogs && filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getOperationIcon(log.operation)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getOperationColor(log.operation) as any}>
                          {log.operation}
                        </Badge>
                        <span className="text-sm font-medium">{log.table_name}</span>
                        {log.record_id && (
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            ID: {log.record_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'PPp')}
                        {log.ip_address && ` • IP: ${log.ip_address}`}
                      </p>
                      {log.user_agent && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {log.user_agent}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Show changed fields for updates */}
                {log.operation === 'UPDATE' && log.old_values && log.new_values && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium mb-2">Changed Fields:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.keys(log.new_values).map((key) => {
                        if (log.old_values[key] !== log.new_values[key]) {
                          return (
                            <div key={key} className="bg-muted/50 p-2 rounded">
                              <span className="font-medium">{key}:</span>
                              <div className="text-muted-foreground">
                                <span className="line-through">{JSON.stringify(log.old_values[key])}</span>
                                {' → '}
                                <span className="text-foreground">{JSON.stringify(log.new_values[key])}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit logs found matching your filters.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
