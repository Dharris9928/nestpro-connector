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

export function JobQuotesRecentActivity() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["job-quotes", "recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_quotes")
        .select("id, quote_number, status, product, quantity, price, date_received, created_at, updated_at, comments, wholesaler:companies!job_quotes_wholesaler_id_fkey(company_name)")
        .order("updated_at", { ascending: false })
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
              {data.map((q) => {
                const isNew =
                  Math.abs(new Date(q.updated_at).getTime() - new Date(q.created_at).getTime()) < 60_000;
                const project = q.comments?.match(/Project: (.*)/)?.[1];
                return (
                  <li key={q.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{isNew ? "New" : "Updated"}</Badge>
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
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={statusVariant(q.status)} className="capitalize">{q.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Changed {formatDistanceToNow(new Date(q.updated_at), { addSuffix: true })}
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
