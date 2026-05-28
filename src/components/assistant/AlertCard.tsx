import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, X, Flame, AlertTriangle, Calendar, Sparkles, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import type { AssistantNotification } from "@/hooks/useAutomationNotifications";

interface AlertCardProps {
  notification: AssistantNotification;
  onDismiss: (id: string) => void;
}

const TYPE_META: Record<string, { icon: any; tone: string; tier: string; label: string }> = {
  automation_hot_lead: { icon: Flame, tone: "border-l-red-500 bg-red-50 dark:bg-red-950/30", tier: "P1", label: "Hot Lead" },
  automation_meeting_followup: { icon: Calendar, tone: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30", tier: "P2", label: "Meeting" },
  automation_stale_opportunity: { icon: AlertTriangle, tone: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30", tier: "P2", label: "Stale" },
  automation_enrichment: { icon: Sparkles, tone: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/30", tier: "P3", label: "Enrichment" },
  automation_flagged: { icon: ShieldAlert, tone: "border-l-red-600 bg-red-50 dark:bg-red-950/30", tier: "P1", label: "System" },
};

export function AlertCard({ notification, onDismiss }: AlertCardProps) {
  const navigate = useNavigate();
  const meta = TYPE_META[notification.type] ?? {
    icon: AlertTriangle,
    tone: "border-l-muted bg-muted/30",
    tier: "P3",
    label: "Alert",
  };
  const Icon = meta.icon;

  return (
    <Card className={`border-l-4 ${meta.tone} p-3 shadow-sm`}>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs h-5">{meta.label}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug">{notification.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
          <div className="flex items-center gap-2 mt-2">
            {notification.link_url && (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                onClick={() => {
                  if (notification.link_url) navigate(notification.link_url);
                  onDismiss(notification.id);
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => onDismiss(notification.id)}
            >
              <X className="h-3 w-3 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
