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

export function ContactAccessLogsViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("7");

  const { data: logs, isLoading } = useQuery({
    queryKey: ['contact-access-logs', actionFilter, timeFilter],
    queryFn: async () => {
      let query = supabase
        .from('contact_access_logs')
        .select(`
          *,
          profiles:user_id(first_name, last_name),
          contacts(first_name, last_name),
          companies(company_name)
        `)
        .order('accessed_at', { ascending: false })
        .limit(100);

      if (actionFilter !== "all") {
        query = query.eq('action', actionFilter);
      }

      if (timeFilter !== "all") {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(timeFilter));
        query = query.gte('accessed_at', daysAgo.toISOString());
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
      log.contacts?.first_name?.toLowerCase().includes(searchLower) ||
      log.contacts?.last_name?.toLowerCase().includes(searchLower) ||
      log.companies?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const exportToCSV = () => {
    if (!filteredLogs) return;

    const headers = ['Date', 'User', 'Action', 'Contact', 'Company', 'IP Address'];
    const rows = filteredLogs.map(log => [
      new Date(log.accessed_at).toLocaleString(),
      `${log.profiles?.first_name} ${log.profiles?.last_name}`,
      log.action,
      `${log.contacts?.first_name} ${log.contacts?.last_name}`,
      log.companies?.company_name || 'N/A',
      log.ip_address || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact-access-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'VIEW': return 'default';
      case 'EXPORT': return 'destructive';
      case 'BULK_VIEW': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Access Audit Log</CardTitle>
        <CardDescription>
          Track all contact data access for GDPR/CCPA compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, contact, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="VIEW">View Only</SelectItem>
              <SelectItem value="EXPORT">Exports Only</SelectItem>
              <SelectItem value="BULK_VIEW">Bulk Access</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
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
                <TableHead>Action</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>IP Address</TableHead>
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
                      {new Date(log.accessed_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {log.profiles?.first_name} {log.profiles?.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.contacts?.first_name} {log.contacts?.last_name}
                    </TableCell>
                    <TableCell>{log.companies?.company_name || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ip_address || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No access logs found
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
