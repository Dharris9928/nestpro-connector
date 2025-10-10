import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ApprovalAuditViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ['approval-audit-logs', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('approval_audit_log')
        .select(`
          *,
          user:user_id(id),
          user_profiles:user_id(first_name, last_name),
          approver:approved_by(id),
          approver_profiles:approved_by(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq('new_status', statusFilter);
      }

      const { data } = await query;
      return data || [];
    }
  });

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.user_profiles?.first_name?.toLowerCase().includes(searchLower) ||
      log.user_profiles?.last_name?.toLowerCase().includes(searchLower) ||
      log.approver_profiles?.first_name?.toLowerCase().includes(searchLower) ||
      log.approver_profiles?.last_name?.toLowerCase().includes(searchLower)
    );
  });

  const exportToCSV = () => {
    if (!filteredLogs) return;

    const headers = ['Date', 'User', 'Previous Status', 'New Status', 'Approved By', 'Notes', 'IP Address'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      `${log.user_profiles?.first_name} ${log.user_profiles?.last_name}`,
      log.previous_status || 'N/A',
      log.new_status,
      log.approver_profiles ? `${log.approver_profiles.first_name} ${log.approver_profiles.last_name}` : 'System',
      log.notes || 'N/A',
      log.ip_address || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approval-audit-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      case 'frozen': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Audit Trail</CardTitle>
        <CardDescription>
          Complete history of user approval status changes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or approver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
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
                <TableHead>Previous Status</TableHead>
                <TableHead>New Status</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {log.user_profiles?.first_name} {log.user_profiles?.last_name}
                    </TableCell>
                    <TableCell>
                      {log.previous_status ? (
                        <Badge variant="outline">{log.previous_status}</Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(log.new_status)}>
                        {log.new_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.approver_profiles ? (
                        `${log.approver_profiles.first_name} ${log.approver_profiles.last_name}`
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.notes || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No approval logs found
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
