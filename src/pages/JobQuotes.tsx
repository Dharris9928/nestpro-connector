import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Filter, Calendar, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddJobQuoteDialog } from "@/components/job-quotes/AddJobQuoteDialog";
import { EditJobQuoteDialog } from "@/components/job-quotes/EditJobQuoteDialog";
import { ImportJobQuotesDialog } from "@/components/job-quotes/ImportJobQuotesDialog";
import { JobQuotesTable } from "@/components/job-quotes/JobQuotesTable";
import { JobQuotesTrends } from "@/components/job-quotes/JobQuotesTrends";
import { JobQuotesSubmissionTrends } from "@/components/job-quotes/JobQuotesSubmissionTrends";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getQuarterOptions } from "@/lib/dates/quarterUtils";

type DatePreset = "all" | "30" | "60" | "90" | string;

export default function JobQuotes() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const quarterOptions = getQuarterOptions();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["job-quotes", statusFilter, datePreset, customRange.from?.toISOString(), customRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("job_quotes")
        .select(`
          *,
          distributor:companies!job_quotes_distributor_id_fkey(id, company_name),
          wholesaler:companies!job_quotes_wholesaler_id_fkey(id, company_name),
          contractor:companies!job_quotes_contractor_id_fkey(id, company_name),
          assignee_profile:profiles!job_quotes_assigned_to_fkey(id, first_name, last_name),
          job_quote_contacts(
            id,
            contact_type,
            contact:contacts(id, first_name, last_name, title)
          )
        `)
        .order("date_received", { ascending: false });

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply date filter
      if (datePreset !== "all") {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (datePreset === "30" || datePreset === "60" || datePreset === "90") {
          const days = parseInt(datePreset);
          const from = subDays(today, days);
          query = query.gte("date_received", from.toISOString()).lte("date_received", today.toISOString());
        } else {
          // Check quarter presets
          const quarterMatch = quarterOptions.find(q => q.value === datePreset);
          if (quarterMatch) {
            query = query.gte("date_received", quarterMatch.from.toISOString()).lte("date_received", quarterMatch.to.toISOString());
          }
        }
      }

      // Apply custom date range
      if (customRange.from && customRange.to) {
        const to = new Date(customRange.to);
        to.setHours(23, 59, 59, 999);
        query = query.gte("date_received", customRange.from.toISOString()).lte("date_received", to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Enrich with sales rep names for those assigned to external reps
      const repIds = (data || []).map((q: any) => q.assigned_to_sales_rep_id).filter(Boolean);
      const repMap: Record<string, any> = {};
      if (repIds.length > 0) {
        const { data: reps } = await supabase
          .from("sales_reps" as any)
          .select("id, first_name, last_name")
          .in("id", repIds);
        for (const rep of (reps || []) as any[]) {
          repMap[rep.id] = rep;
        }
      }
      
      return (data || []).map((q: any) => ({
        ...q,
        assignee_sales_rep: q.assigned_to_sales_rep_id ? repMap[q.assigned_to_sales_rep_id] || null : null,
      }));
    },
    enabled: !!currentUser,
  });

  // Get stale quotes (pending for 3+ months)
  const staleQuotes = quotes.filter((quote: any) => {
    if (quote.status !== "pending") return false;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return new Date(quote.date_received) < threeMonthsAgo;
  });

  const handleEdit = (quote: any) => {
    setSelectedQuote(quote);
    setEditDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase
        .from("job_quotes")
        .delete()
        .eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["job-quotes"] });
      toast({ title: "Quote deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingCount = quotes.filter((q: any) => q.status === "pending").length;
  const wonCount = quotes.filter((q: any) => q.status === "won").length;
  const lostCount = quotes.filter((q: any) => q.status === "lost").length;

  // Submissions in last 30 days (based on date_received, independent of active filters)
  const last30Cutoff = subDays(new Date(), 30);
  const submissionsLast30 = quotes.filter(
    (q: any) => q.date_received && new Date(q.date_received) >= last30Cutoff
  ).length;

  // Avg Time to Close (days) - for won quotes
  const wonQuotes = quotes.filter((q: any) => q.status === "won" && q.date_received && q.date_won);
  const avgTimeToClose = wonQuotes.length > 0
    ? Math.round(wonQuotes.reduce((sum: number, q: any) => {
        const received = new Date(q.date_received);
        const won = new Date(q.date_won);
        return sum + (won.getTime() - received.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / wonQuotes.length)
    : null;

  // Avg Time Pending (days) - for pending quotes
  const pendingQuotes = quotes.filter((q: any) => q.status === "pending" && q.date_received);
  const avgTimePending = pendingQuotes.length > 0
    ? Math.round(pendingQuotes.reduce((sum: number, q: any) => {
        const received = new Date(q.date_received);
        return sum + (Date.now() - received.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / pendingQuotes.length)
    : null;

  // Win/Loss Ratio
  const winLossRatio = (wonCount + lostCount) > 0
    ? (wonCount / (wonCount + lostCount) * 100).toFixed(1)
    : null;

  // Average Quote Size
  const quotesWithPrice = quotes.filter((q: any) => q.price !== null && q.price !== undefined);
  const avgQuoteSize = quotesWithPrice.length > 0
    ? quotesWithPrice.reduce((sum: number, q: any) => sum + (parseFloat(q.price) || 0), 0) / quotesWithPrice.length
    : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Quotes</h1>
          <p className="text-muted-foreground">
            Track and manage incoming job quotes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Quote
          </Button>
        </div>
      </div>

      {/* Stale Quotes Alert */}
      {staleQuotes.length > 0 && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-warning">
                  {staleQuotes.length} quote{staleQuotes.length > 1 ? "s" : ""} pending for 3+ months
                </p>
                <p className="text-sm text-muted-foreground">
                  Consider following up or updating the status
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submissions (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{submissionsLast30}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{quotes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{wonCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{lostCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Time to Close
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {avgTimeToClose !== null ? `${avgTimeToClose} days` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Time Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">
              {avgTimePending !== null ? `${avgTimePending} days` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win/Loss Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {winLossRatio !== null ? `${winLossRatio}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Quote Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {avgQuoteSize !== null
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(avgQuoteSize)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submission Trends */}
      <JobQuotesSubmissionTrends />

      {/* Volume & Value Trends */}
      <JobQuotesTrends />


      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Day preset buttons */}
        <div className="flex items-center gap-1">
          {[
            { label: "All Time", value: "all" },
            { label: "30 Days", value: "30" },
            { label: "60 Days", value: "60" },
            { label: "90 Days", value: "90" },
          ].map((preset) => (
            <Button
              key={preset.value}
              variant={datePreset === preset.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDatePreset(preset.value);
                setCustomRange({});
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Quarter dropdown */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select
            value={quarterOptions.find(q => q.value === datePreset) ? datePreset : "none"}
            onValueChange={(val) => {
              if (val !== "none") {
                setDatePreset(val);
                setCustomRange({});
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select Quarter</SelectItem>
              {quarterOptions.map((q) => (
                <SelectItem key={q.value} value={q.value}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom date range picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={customRange.from && customRange.to ? "default" : "outline"}
              size="sm"
              className={cn("min-w-[180px] justify-start text-left font-normal")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {customRange.from && customRange.to ? (
                <>
                  {format(customRange.from, "MMM d")} - {format(customRange.to, "MMM d, yyyy")}
                </>
              ) : (
                "Custom Range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="end">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={customRange.from || new Date()}
              selected={{ from: customRange.from, to: customRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setCustomRange({ from: range.from, to: range.to });
                  setDatePreset("custom");
                } else if (!range?.from && !range?.to) {
                  setCustomRange({});
                  setDatePreset("all");
                }
              }}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <JobQuotesTable
        quotes={quotes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        staleQuoteIds={staleQuotes.map((q: any) => q.id)}
      />

      {/* Dialogs */}
      <AddJobQuoteDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <ImportJobQuotesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
      
      {selectedQuote && (
        <EditJobQuoteDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          quote={selectedQuote}
        />
      )}
    </div>
  );
}
