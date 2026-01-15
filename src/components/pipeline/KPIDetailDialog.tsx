import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export type KPICategory = 
  | "comms_sent"
  | "emails_opened"
  | "replies_received"
  | "phone_calls"
  | "meetings_scheduled"
  | "demos_completed"
  | "leads_assigned"
  | "closed_deals";

interface KPIDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: KPICategory | null;
  title: string;
}

export function KPIDetailDialog({ open, onOpenChange, category, title }: KPIDetailDialogProps) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["kpi-detail", category],
    queryFn: async () => {
      if (!category) return [];

      switch (category) {
        case "comms_sent": {
          const { data, error } = await supabase
            .from("company_communications")
            .select("id, subject, sent_at, companies(company_name), contacts(first_name, last_name)")
            .not("sent_at", "is", null)
            .order("sent_at", { ascending: false })
            .limit(100);
          if (error) throw error;
          return data?.map(d => ({
            id: d.id,
            title: d.subject || "No subject",
            subtitle: d.companies?.company_name || "Unknown company",
            contact: d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}` : null,
            date: d.sent_at,
          })) || [];
        }

        case "emails_opened": {
          const { data, error } = await supabase
            .from("company_communications")
            .select("id, subject, email_opened_at, companies(company_name), contacts(first_name, last_name)")
            .not("email_opened_at", "is", null)
            .order("email_opened_at", { ascending: false })
            .limit(100);
          if (error) throw error;
          return data?.map(d => ({
            id: d.id,
            title: d.subject || "No subject",
            subtitle: d.companies?.company_name || "Unknown company",
            contact: d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}` : null,
            date: d.email_opened_at,
          })) || [];
        }

        case "replies_received": {
          const { data, error } = await supabase
            .from("company_communications")
            .select("id, subject, email_responded_at, companies(company_name), contacts(first_name, last_name)")
            .not("email_responded_at", "is", null)
            .order("email_responded_at", { ascending: false })
            .limit(100);
          if (error) throw error;
          return data?.map(d => ({
            id: d.id,
            title: d.subject || "No subject",
            subtitle: d.companies?.company_name || "Unknown company",
            contact: d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name}` : null,
            date: d.email_responded_at,
          })) || [];
        }

        case "phone_calls": {
          const { data, error } = await supabase
            .from("outreach_activities")
            .select("id, subject_line, completed_date, companies(company_name)")
            .eq("activity_type", "Phone")
            .order("completed_date", { ascending: false })
            .limit(100);
          if (error) throw error;
          return data?.map(d => ({
            id: d.id,
            title: d.subject_line || "Phone Call",
            subtitle: d.companies?.company_name || "Unknown company",
            contact: null,
            date: d.completed_date,
          })) || [];
        }

        case "meetings_scheduled": {
          const { data, error } = await supabase
            .from("outreach_activities")
            .select("id, subject_line, scheduled_date, outcome, companies(company_name)")
            .in("activity_type", ["Meeting", "Demo"])
            .eq("outcome", "Scheduled")
            .order("scheduled_date", { ascending: false })
            .limit(100);
          if (error) throw error;
          return data?.map(d => ({
            id: d.id,
            title: d.subject_line || "Meeting",
            subtitle: d.companies?.company_name || "Unknown company",
            contact: null,
            date: d.scheduled_date,
            badge: d.outcome,
          })) || [];
        }

        case "demos_completed": {
          const { data, error } = await supabase
            .from("outreach_activities")
            .select("id, subject_line, completed_date, companies(company_name)")
            .eq("activity_type", "Demo")
            .eq("outcome", "Completed")
            .order("completed_date", { ascending: false })
            .limit(100);
          if (error) throw error;
          return data?.map(d => ({
            id: d.id,
            title: d.subject_line || "Demo",
            subtitle: d.companies?.company_name || "Unknown company",
            contact: null,
            date: d.completed_date,
          })) || [];
        }

        case "leads_assigned": {
          const { data, error } = await supabase
            .from("opportunities")
            .select("id, opportunity_name, created_at, companies!opportunities_company_id_fkey(company_name), assigned_profile:profiles!opportunities_assigned_to_fkey(first_name, last_name)")
            .not("assigned_to", "is", null)
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) throw error;
          return data?.map(d => ({
            id: d.id,
            title: d.opportunity_name || "Opportunity",
            subtitle: (d.companies as any)?.company_name || "Unknown company",
            contact: d.assigned_profile ? `Assigned to: ${d.assigned_profile.first_name} ${d.assigned_profile.last_name}` : null,
            date: d.created_at,
          })) || [];
        }

        case "closed_deals": {
          const { data, error } = await supabase
            .from("opportunities")
            .select("id, opportunity_name, closed_date, amount, companies!opportunities_company_id_fkey(company_name)")
            .eq("stage", "Closed Won")
            .order("closed_date", { ascending: false })
            .limit(100);
          if (error) throw error;
          return data?.map(d => ({
            id: d.id,
            title: d.opportunity_name || "Closed Deal",
            subtitle: (d.companies as any)?.company_name || "Unknown company",
            contact: d.amount ? `$${d.amount.toLocaleString()}` : null,
            date: d.closed_date,
          })) || [];
        }

        default:
          return [];
      }
    },
    enabled: open && !!category,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                      {item.contact && (
                        <p className="text-sm text-muted-foreground">{item.contact}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {item.date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.date), "MMM d, yyyy")}
                        </p>
                      )}
                      {item.badge && (
                        <Badge variant="secondary" className="mt-1">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No items found
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
