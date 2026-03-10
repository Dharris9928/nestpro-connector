import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, ShieldAlert, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from '@e965/xlsx';

export function BlockedSignupsViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("30");

  const { data: blockedAttempts, isLoading } = useQuery({
    queryKey: ['blocked-signup-attempts', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('blocked_signup_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(500);

      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('attempted_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const filteredAttempts = blockedAttempts?.filter(attempt => {
    if (!searchTerm) return true;
    const email = attempt.email?.toLowerCase() || '';
    const domain = attempt.email_domain?.toLowerCase() || '';
    const reason = attempt.blocked_reason?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return email.includes(search) || domain.includes(search) || reason.includes(search);
  });

  const handleExport = () => {
    if (!filteredAttempts || filteredAttempts.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredAttempts.map(attempt => ({
      'Date/Time': new Date(attempt.attempted_at).toLocaleString(),
      'Email': attempt.email,
      'Domain': attempt.email_domain,
      'Reason': attempt.blocked_reason,
      'Is Disposable': attempt.is_disposable ? 'Yes' : 'No',
      'MX Checked': attempt.mx_records_checked ? 'Yes' : 'No',
      'IP Address': attempt.ip_address || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Blocked Signups');
    XLSX.writeFile(wb, `blocked-signups-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Blocked signups exported successfully');
  };

  const getReasonBadge = (reason: string, isDisposable: boolean) => {
    if (isDisposable) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Disposable Email</Badge>;
    }
    if (reason.includes('unauthorized')) {
      return <Badge variant="destructive"><ShieldAlert className="h-3 w-3 mr-1" />Unauthorized Domain</Badge>;
    }
    return <Badge variant="secondary">{reason}</Badge>;
  };

  // Calculate statistics
  const stats = {
    total: filteredAttempts?.length || 0,
    disposable: filteredAttempts?.filter(a => a.is_disposable).length || 0,
    unauthorized: filteredAttempts?.filter(a => a.blocked_reason.includes('unauthorized')).length || 0
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Blocked Signup Attempts
            </CardTitle>
            <CardDescription>
              Monitor and analyze blocked registration attempts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Blocked</p>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold text-destructive">{stats.disposable}</div>
            <p className="text-sm text-muted-foreground">Disposable Emails</p>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold text-warning">{stats.unauthorized}</div>
            <p className="text-sm text-muted-foreground">Unauthorized Domains</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, domain, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" className="w-full md:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Results summary */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredAttempts?.length || 0} of {blockedAttempts?.length || 0} blocked attempts
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading blocked attempts...
                  </TableCell>
                </TableRow>
              ) : filteredAttempts && filteredAttempts.length > 0 ? (
                filteredAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(attempt.attempted_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{attempt.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{attempt.email_domain}</Badge>
                    </TableCell>
                    <TableCell>
                      {getReasonBadge(attempt.blocked_reason, attempt.is_disposable)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {attempt.ip_address ? String(attempt.ip_address) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No blocked signup attempts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
