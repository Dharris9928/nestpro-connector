import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddJobQuoteDialog } from "@/components/job-quotes/AddJobQuoteDialog";
import { EditJobQuoteDialog } from "@/components/job-quotes/EditJobQuoteDialog";
import { JobQuotesTable } from "@/components/job-quotes/JobQuotesTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function JobQuotes() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["job-quotes", statusFilter],
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

      const { data, error } = await query;
      if (error) throw error;
      
      // Enrich with sales rep names for those assigned to external reps
      const repIds = (data || []).map((q: any) => q.assigned_to_sales_rep_id).filter(Boolean);
      let repMap: Record<string, any> = {};
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
      queryClient.invalidateQueries({ queryKey: ["job-quotes"] });
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
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
