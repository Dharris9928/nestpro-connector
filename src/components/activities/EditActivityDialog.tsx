import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ContactMultiSelect } from "@/components/common/ContactMultiSelect";

interface EditActivityDialogProps {
  activity: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditActivityDialog({
  activity,
  open,
  onOpenChange,
  onSuccess,
}: EditActivityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    activity_type: "Email" as const,
    subject_line: "",
    message_content: "",
    outcome: "Completed" as const,
    completed_date: new Date().toISOString().split("T")[0],
    email_opened_at: "",
    email_responded_at: "",
    notes: "",
    opportunity_id: "none" as string,
  });

  // Fetch opportunities for the company
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', activity?.company_id],
    queryFn: async () => {
      if (!activity?.company_id) return [];
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, opportunity_name, stage')
        .eq('company_id', activity.company_id)
        .order('opportunity_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activity?.company_id && open,
  });

  // Fetch contacts for the company
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', activity?.company_id],
    queryFn: async () => {
      if (!activity?.company_id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('company_id', activity.company_id)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activity?.company_id && open,
  });

  // Fetch existing contact associations
  const { data: existingContacts = [] } = useQuery({
    queryKey: ['activity-contacts', activity?.id],
    queryFn: async () => {
      if (!activity?.id) return [];
      const { data, error } = await supabase
        .from('activity_contacts')
        .select('contact_id')
        .eq('activity_id', activity.id);
      if (error) throw error;
      return data.map(ac => ac.contact_id);
    },
    enabled: !!activity?.id && open,
  });

  useEffect(() => {
    if (activity && open) {
      // Format datetime for datetime-local input
      const formatDateTimeLocal = (dateStr: string | null) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16);
      };

      setFormData({
        activity_type: activity.activity_type || "Email",
        subject_line: activity.subject_line || "",
        message_content: activity.message_content || "",
        outcome: activity.outcome || "Completed",
        completed_date: activity.completed_date || new Date().toISOString().split("T")[0],
        email_opened_at: formatDateTimeLocal(activity.email_opened_at),
        email_responded_at: formatDateTimeLocal(activity.email_responded_at),
        notes: activity.notes || "",
        opportunity_id: activity.opportunity_id || "none",
      });
      setSelectedContactIds(existingContacts);
    }
  }, [activity, open, existingContacts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity?.id) return;

    setIsSubmitting(true);

    try {
      // Update activity
      const { error } = await supabase
        .from("outreach_activities")
        .update({
          activity_type: formData.activity_type,
          subject_line: formData.subject_line,
          message_content: formData.message_content,
          outcome: formData.outcome,
          completed_date: formData.completed_date,
          email_opened_at: formData.email_opened_at || null,
          email_responded_at: formData.email_responded_at || null,
          notes: formData.notes,
          opportunity_id: formData.opportunity_id === "none" ? null : formData.opportunity_id,
        })
        .eq("id", activity.id);

      if (error) throw error;

      // Delete existing contact associations
      const { error: deleteError } = await supabase
        .from("activity_contacts")
        .delete()
        .eq("activity_id", activity.id);

      if (deleteError) throw deleteError;

      // Create new contact associations
      if (selectedContactIds.length > 0) {
        const { error: insertError } = await supabase
          .from("activity_contacts")
          .insert(
            selectedContactIds.map(contactId => ({
              activity_id: activity.id,
              contact_id: contactId,
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Activity updated successfully",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="activity_type">Activity Type *</Label>
            <Select
              value={formData.activity_type}
              onValueChange={(value: any) =>
                setFormData((prev) => ({ ...prev, activity_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
                <SelectItem value="LinkedIn Connection">LinkedIn Connection</SelectItem>
                <SelectItem value="LinkedIn Message">LinkedIn Message</SelectItem>
                <SelectItem value="Meeting">Meeting</SelectItem>
                <SelectItem value="Demo">Demo</SelectItem>
                <SelectItem value="Training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contacts */}
          <div>
            <Label htmlFor="contacts">Contacts (Optional)</Label>
            <ContactMultiSelect
              contacts={contacts}
              selectedContactIds={selectedContactIds}
              onSelectedContactsChange={setSelectedContactIds}
              placeholder="Select contacts..."
            />
          </div>

          {/* Opportunity */}
          <div>
            <Label htmlFor="opportunity">Opportunity (Optional)</Label>
            <Select
              value={formData.opportunity_id}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, opportunity_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select opportunity (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {opportunities.map((opp: any) => (
                  <SelectItem key={opp.id} value={opp.id}>
                    {opp.opportunity_name} ({opp.stage})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject_line">Subject Line</Label>
            <Input
              id="subject_line"
              value={formData.subject_line}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject_line: e.target.value }))
              }
              placeholder="Brief description of activity"
            />
          </div>

          <div>
            <Label htmlFor="message_content">Message/Notes</Label>
            <Textarea
              id="message_content"
              value={formData.message_content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message_content: e.target.value }))
              }
              placeholder="Activity details"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="outcome">Outcome *</Label>
            <Select
              value={formData.outcome}
              onValueChange={(value: any) =>
                setFormData((prev) => ({ ...prev, outcome: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Opened">Opened</SelectItem>
                <SelectItem value="Clicked">Clicked</SelectItem>
                <SelectItem value="Replied">Replied</SelectItem>
                <SelectItem value="Connected">Connected</SelectItem>
                <SelectItem value="No Answer">No Answer</SelectItem>
                <SelectItem value="Bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="completed_date">Date *</Label>
            <Input
              id="completed_date"
              type="date"
              value={formData.completed_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, completed_date: e.target.value }))
              }
            />
          </div>

          {formData.activity_type === "Email" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email_opened_at">Email Opened Date</Label>
                <Input
                  id="email_opened_at"
                  type="datetime-local"
                  value={formData.email_opened_at}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email_opened_at: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="email_responded_at">Email Responded Date</Label>
                <Input
                  id="email_responded_at"
                  type="datetime-local"
                  value={formData.email_responded_at}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email_responded_at: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Any additional information"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
