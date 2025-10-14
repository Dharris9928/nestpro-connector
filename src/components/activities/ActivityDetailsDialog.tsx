import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Mail, Phone, Linkedin, Calendar, User, Building2, FileText, MessageSquare } from "lucide-react";

interface Activity {
  id: string;
  activity_type: string;
  company_id: string;
  contact_id?: string | null;
  subject_line?: string | null;
  message_content?: string | null;
  outcome?: string | null;
  scheduled_date?: string | null;
  completed_date?: string | null;
  notes?: string | null;
  status?: string | null;
  duration_minutes?: number | null;
  created_at: string;
  companies?: {
    company_name: string;
  };
  contacts?: {
    first_name: string;
    last_name: string;
    title?: string | null;
  };
}

interface ActivityDetailsDialogProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityDetailsDialog({ activity, open, onOpenChange }: ActivityDetailsDialogProps) {
  if (!activity) return null;

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'phone call':
        return <Phone className="h-5 w-5" />;
      case 'linkedin message':
        return <Linkedin className="h-5 w-5" />;
      case 'meeting':
        return <Calendar className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status?: string | null) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getActivityIcon(activity.activity_type)}
            <DialogTitle className="text-xl">Activity Details</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Activity Type and Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-base px-3 py-1">
              {activity.activity_type}
            </Badge>
            {activity.status && (
              <Badge className={getStatusColor(activity.status)}>
                {activity.status}
              </Badge>
            )}
            {activity.outcome && (
              <Badge variant="secondary">
                {activity.outcome}
              </Badge>
            )}
          </div>

          {/* Company */}
          {activity.companies && (
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{activity.companies.company_name}</p>
              </div>
            </div>
          )}

          {/* Contact */}
          {activity.contacts && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Contact</p>
                <p className="font-medium">
                  {activity.contacts.first_name} {activity.contacts.last_name}
                </p>
                {activity.contacts.title && (
                  <p className="text-sm text-muted-foreground">{activity.contacts.title}</p>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {activity.scheduled_date && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="font-medium">
                    {format(new Date(activity.scheduled_date), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            )}
            {activity.completed_date && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="font-medium">
                    {format(new Date(activity.completed_date), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Duration */}
          {activity.duration_minutes && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{activity.duration_minutes} minutes</p>
              </div>
            </div>
          )}

          {/* Subject */}
          {activity.subject_line && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Subject</p>
                <p className="font-medium">{activity.subject_line}</p>
              </div>
            </div>
          )}

          {/* Message Content */}
          {activity.message_content && (
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Message</p>
                <div className="bg-muted/30 p-4 rounded-md whitespace-pre-wrap text-sm">
                  {activity.message_content}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {activity.notes && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <div className="bg-muted/30 p-4 rounded-md text-sm">
                  {activity.notes}
                </div>
              </div>
            </div>
          )}

          {/* Created At */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}