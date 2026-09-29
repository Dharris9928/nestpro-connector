import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";

const statusVariant = (s: string): "default" | "destructive" | "secondary" =>
  s === "won" ? "default" : s === "lost" ? "destructive" : "secondary";

const fmt = (n: number | null) =>
  n ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function describeChanges(changes: Record<string, { from: any; to: any }>): string[] {
  const parts: string[] = [];
  for (const [field, { from, to }] of Object.entries(changes || {})) {
    if (field === "status") {
      parts.push(`Status: ${cap(String(from ?? "—"))} → ${cap(String(to ?? "—"))}`);
    } else if (field === "price") {
      parts.push(`Price: ${fmt(from)} → ${fmt(to)}`);
    } else if (field === "quantity") {
      parts.push(`Qty: ${from ?? "—"} → ${to ?? "—"}`);
    } else if (field === "assignee") {
      parts.push(to ? "Assignee set" : "Assignee removed");
    } else if (field === "quote_number") {
      parts.push(`TSM Quote #: ${from ?? "—"} → ${to ?? "—"}`);
    } else if (field === "product") {
      parts.push("Product changed");
    } else if (field === "comments") {
      parts.push("Comments updated");
    }
  }
  return parts;
}

export function JobQuotesRecentActivity() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["job-quotes", "recent-activity-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_quote_change_log")
        .select("id, change_type, changes, changed_at, job_quote:job_quotes!job_quote_change_log_job_quote_id_fkey(id, quote_number, status, product, quantity, price, date_received, comments, wholesaler:companies!job_quotes_wholesaler_id_fkey(company_name))")
        .order("changed_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Recent Updates & Changes (last 30)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">Could not load recent changes: {(error as Error).message}</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ScrollArea className="h-80 pr-3">
            <ul className="divide-y">
              {data.map((entry) => {
                const q = entry.job_quote;
                if (!q) return null;
                const isNew = entry.change_type === "insert";
                const project = q.comments?.match(/Project: (.*)/)?.[1];
                const changeDescriptions = isNew ? [] : describeChanges(entry.changes);
                return (
                  <li key={entry.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{isNew ? "New entry" : "Updated"}</Badge>
                        <span className="font-medium text-sm truncate">
                          {project || q.wholesaler?.company_name || "Job quote"}
                        </span>
                        {q.quote_number && (
                          <span className="text-xs text-muted-foreground">#{q.quote_number}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {q.wholesaler?.company_name ? `${q.wholesaler.company_name} · ` : ""}
                        {q.product || "—"} × {q.quantity} · {fmt(q.price)}
                      </p>
                      {changeDescriptions.length > 0 && (
                        <p className="text-xs mt-0.5 text-foreground/80">
                          {changeDescriptions.join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={statusVariant(q.status)} className="capitalize">{q.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isNew ? "Added" : "Changed"} {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                      </p>
                      {q.date_received && (
                        <p className="text-xs text-muted-foreground">
                          Submitted {new Date(q.date_received).toLocaleDateString("en-US", { timeZone: "UTC" })}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
