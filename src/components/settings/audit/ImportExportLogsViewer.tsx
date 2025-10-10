import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ImportExportLogsViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ['import-export-logs', activityFilter],
    queryFn: async () => {
      let query = supabase
        .from('import_export_logs')
        .select(`
          *,
          profiles:user_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (activityFilter !== "all") {
        query = query.eq('activity_type', activityFilter);
      }

      const { data } = await query;
      return data || [];
    }
  });

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.profiles?.first_name?.toLowerCase().includes(searchLower) ||
      log.profiles?.last_name?.toLowerCase().includes(searchLower) ||
      log.table_name?.toLowerCase().includes(searchLower) ||
      log.file_format?.toLowerCase().includes(searchLower)
    );
  });

  const exportToCSV = () => {
    if (!filteredLogs) return;

    const headers = ['Date', 'User', 'Activity', 'Table', 'Format', 'Records', 'Success', 'Failed', 'Duplicates'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      `${log.profiles?.first_name} ${log.profiles?.last_name}`,
      log.activity_type,
      log.table_name,
      log.file_format || 'N/A',
      log.record_count,
      log.successful_count,
      log.failed_count,
      log.duplicate_count
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-export-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getActivityIcon = (activity: string) => {
    return activity === 'IMPORT' ? <Upload className="h-4 w-4" /> : <Download className="h-4 w-4" />;
  };

  const getActivityBadgeVariant = (activity: string) => {
    return activity === 'IMPORT' ? 'default' : 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import/Export Activity Log</CardTitle>
        <CardDescription>
          Track all data import and export operations for compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, table, or format..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="IMPORT">Imports Only</SelectItem>
              <SelectItem value="EXPORT">Exports Only</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Format</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">Success</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Duplicates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {log.profiles?.first_name} {log.profiles?.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActivityBadgeVariant(log.activity_type)} className="gap-1">
                        {getActivityIcon(log.activity_type)}
                        {log.activity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.file_format || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{log.record_count}</TableCell>
                    <TableCell className="text-right font-mono text-success">{log.successful_count}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      {log.failed_count > 0 ? log.failed_count : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-warning">
                      {log.duplicate_count > 0 ? log.duplicate_count : '—'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No import/export logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredLogs?.length || 0} of {logs?.length || 0} total logs
        </div>
      </CardContent>
    </Card>
  );
}
