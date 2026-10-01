import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Filter, Calendar, Upload, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AddJobQuoteDialog } from "@/components/job-quotes/AddJobQuoteDialog";
import { EditJobQuoteDialog } from "@/components/job-quotes/EditJobQuoteDialog";
import { ImportJobQuotesDialog } from "@/components/job-quotes/ImportJobQuotesDialog";
import {
  JobQuotesTable,
  DENSITY_KEY,
  type Density,
} from "@/components/job-quotes/JobQuotesTable";
import { JobQuotesTrends } from "@/components/job-quotes/JobQuotesTrends";
import { JobQuotesSubmissionTrends } from "@/components/job-quotes/JobQuotesSubmissionTrends";
import { JobQuotesRecentActivity } from "@/components/job-quotes/JobQuotesRecentActivity";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [overviewOpen, setOverviewOpen] = useState(() => {
    try {
      return window.localStorage.getItem("job-quotes-overview") !== "closed";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("job-quotes-overview", overviewOpen ? "open" : "closed");
    } catch {
      // storage unavailable (private browsing) — the preference just won't persist
    }
  }, [overviewOpen]);

  const [density, setDensity] = useState<Density>(() => {
    try {
      return window.localStorage.getItem(DENSITY_KEY) === "comfortable"
        ? "comfortable"
        : "compact";
    } catch {
      return "compact";
    }
  });

  const changeDensity = (next: Density) => {
    setDensity(next);
    try {
      window.localStorage.setItem(DENSITY_KEY, next);
    } catch {
      // storage unavailable (private browsing) — the preference just won't persist
    }
  };
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
    // Data version forces open sessions to discard quote data cached before
    // imported pricing and rep-firm assignments were saved.
    queryKey: ["job-quotes", "data-v3", statusFilter, datePreset, customRange.from?.toISOString(), customRange.to?.toISOString()],
    refetchOnMount: "always",
    queryFn: async () => {
      let query = supabase
        .from("job_quotes")
        .select(`
          *,
          distributor:companies!job_quotes_distributor_id_fkey(id, company_name, status, segment, city, state),
          wholesaler:companies!job_quotes_wholesaler_id_fkey(id, company_name, status, segment, city, state),
          contractor:companies!job_quotes_contractor_id_fkey(id, company_name, status, segment, city, state),
          assignee_profile:profiles!job_quotes_assigned_to_fkey(id, first_name, last_name, role),
          job_quote_products(id, product_name, quantity, unit_price, total_price),
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
          .select("id, first_name, last_name, email, territory, covered_states, active, is_firm")
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

  // Global text search across all visible fields
  const searchLower = searchQuery.trim().toLowerCase();
  const matchesSearch = (q: any): boolean => {
    if (!searchLower) return true;
    const haystack = [
      q.product,
      q.po_number,
      q.comments,
      q.notes,
      q.status,
      q.distributor?.company_name,
      q.wholesaler?.company_name,
      q.contractor?.company_name,
      q.assignee_profile
        ? `${q.assignee_profile.first_name} ${q.assignee_profile.last_name}`
        : "",
      q.assignee_sales_rep
        ? `${q.assignee_sales_rep.first_name} ${q.assignee_sales_rep.last_name}`
        : "",
      ...(q.job_quote_contacts || []).map((c: any) =>
        `${c.contact?.first_name || ""} ${c.contact?.last_name || ""} ${c.contact?.title || ""}`
      ),
      q.date_received ? format(new Date(q.date_received), "MMM d, yyyy") : "",
      q.date_won ? format(new Date(q.date_won), "MMM d, yyyy") : "",
      String(q.quantity ?? ""),
      String(q.price ?? ""),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchLower);
  };

  const displayQuotes = searchLower ? quotes.filter(matchesSearch) : quotes;

  // Group quotes by assignee for tabbed view
  const getAssigneeLabel = (q: any): string | null => {
    if (q.assignee_sales_rep) {
      const rep = q.assignee_sales_rep;
      return rep.is_firm ? rep.first_name : `${rep.first_name} ${rep.last_name}`.trim();
    }
    if (q.assignee_profile) {
      return `${q.assignee_profile.first_name || ""} ${q.assignee_profile.last_name || ""}`.trim() || null;
    }
    return null;
  };
  const assigneeGroups = displayQuotes.reduce((acc: Record<string, any[]>, q: any) => {
    const label = getAssigneeLabel(q);
    if (label) {
      (acc[label] = acc[label] || []).push(q);
    }
    return acc;
  }, {});
  const unassignedQuotes = displayQuotes.filter((q: any) => !getAssigneeLabel(q));
  const assigneeTabs = Object.entries(assigneeGroups)
    .map(([label, qs]) => ({ label, quotes: qs as any[] }))
    .sort((a, b) => b.quotes.length - a.quotes.length);

  const renderQuotesTable = (list: any[]) => (
    <JobQuotesTable
      density={density}
      quotes={list}
      isLoading={isLoading}
      onEdit={handleEdit}
      onDelete={(id) => deleteMutation.mutate(id)}
      staleQuoteIds={staleQuotes.map((q: any) => q.id)}
    />
  );

  return (
    <div className="container mx-auto px-4 pt-3 pb-6 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">Job Quotes</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setOverviewOpen((open) => !open)}
          >
            {overviewOpen ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            {overviewOpen ? "Hide overview" : "Show overview"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Quote
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <Card className="py-1.5">
        <CardContent className="px-3 py-0">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {[
              { label: "Submissions 30d", value: String(submissionsLast30), tone: "text-primary" },
              { label: "Total", value: String(quotes.length), tone: "" },
              { label: "Pending", value: String(pendingCount), tone: "text-warning" },
              { label: "Won", value: String(wonCount), tone: "text-success" },
              { label: "Lost", value: String(lostCount), tone: "text-destructive" },
              {
                label: "Win rate",
                value: winLossRatio !== null ? `${winLossRatio}%` : "—",
                tone: "text-success",
              },
              {
                label: "Avg close",
                value: avgTimeToClose !== null ? `${avgTimeToClose} days` : "—",
                tone: "",
              },
              {
                label: "Avg pending",
                value: avgTimePending !== null ? `${avgTimePending} days` : "—",
                tone: "text-warning",
              },
              {
                label: "Avg quote size",
                value: avgQuoteSize !== null
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(avgQuoteSize)
                  : "—",
                tone: "",
              },
              ...(staleQuotes.length > 0
                ? [
                    {
                      label: "Pending 3+ months",
                      value: String(staleQuotes.length),
                      tone: "text-warning",
                    },
                  ]
                : []),
            ].map((kpi) => (
              <div key={kpi.label} className="flex items-baseline gap-1">
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {kpi.label}
                </span>
                <span className={cn("text-sm font-semibold tabular-nums", kpi.tone)}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>



      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes (product, PO #, comments, notes, company, contact…)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <Plus className="h-4 w-4 rotate-45" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-sm">
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
              className="h-7 px-2 text-xs"
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
            <SelectTrigger className="h-8 w-[150px] text-sm">
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
              className={cn("h-8 min-w-[170px] justify-start text-left font-normal text-xs")}
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
                setCustomRange({ from: range?.from, to: range?.to });
                if (range?.from && range?.to) {
                  setDatePreset("custom");
                } else if (!range?.from && !range?.to) {
                  setDatePreset("all");
                }
              }}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Table grouped by assignee */}
      <Tabs defaultValue="all">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="h-7 px-2.5 text-xs">
              All <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{displayQuotes.length}</Badge>
            </TabsTrigger>
            {assigneeTabs.map((tab) => (
              <TabsTrigger key={tab.label} value={tab.label} className="h-7 px-2.5 text-xs">
                {tab.label} <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{tab.quotes.length}</Badge>
              </TabsTrigger>
            ))}
            <TabsTrigger value="unassigned" className="h-7 px-2.5 text-xs">
              Unassigned <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{unassignedQuotes.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {displayQuotes.length} of {quotes.length} quotes
            </span>
            <div className="flex items-center gap-1 rounded-md border bg-card p-0.5">
              {(["compact", "comfortable"] as Density[]).map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={density === option ? "secondary" : "ghost"}
                  className="h-6 px-2 text-xs"
                  onClick={() => changeDensity(option)}
                >
                  {option === "compact" ? "Compact" : "Comfortable"}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <TabsContent value="all">{renderQuotesTable(displayQuotes)}</TabsContent>
        {assigneeTabs.map((tab) => (
          <TabsContent key={tab.label} value={tab.label}>
            {renderQuotesTable(tab.quotes)}
          </TabsContent>
        ))}
        <TabsContent value="unassigned">{renderQuotesTable(unassignedQuotes)}</TabsContent>
      </Tabs>

      {/* Overview panels: recent updates, submission trends, volume & value */}
      {overviewOpen && (
        <div className="space-y-6">
          <JobQuotesRecentActivity />
          <JobQuotesSubmissionTrends />
          <JobQuotesTrends />
        </div>
      )}

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
