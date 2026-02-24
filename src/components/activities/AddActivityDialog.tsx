import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { ContactMultiSelect } from "@/components/common/ContactMultiSelect";

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId?: string;
  companyName?: string;
  contactIds?: string[];
  followUpContext?: string;
}

export function AddActivityDialog({
  open,
  onOpenChange,
  onSuccess,
  companyId,
  companyName,
  contactIds,
  followUpContext,
}: AddActivityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);
  const debouncedSearch = useDebounce(companySearch, 300);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<{
    company_id: string;
    activity_type: string;
    subject_line: string;
    message_content: string;
    outcome: string;
    completed_date: string;
    scheduled_date: string;
    email_opened_at: string;
    email_responded_at: string;
    notes: string;
  }>({
    company_id: "",
    activity_type: "Email",
    subject_line: "",
    message_content: "",
    outcome: "Completed",
    completed_date: new Date().toISOString().split("T")[0],
    scheduled_date: "",
    email_opened_at: "",
    email_responded_at: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadCompanies();
      if (companyId && companyName) {
        setFormData(prev => ({ 
          ...prev, 
          company_id: companyId,
          notes: followUpContext || ""
        }));
        setSelectedContactIds(contactIds || []);
        setCompanySearch(companyName);
      } else {
        setFormData({
          company_id: "",
          activity_type: "Email",
          subject_line: "",
          message_content: "",
          outcome: "Completed",
          completed_date: new Date().toISOString().split("T")[0],
          scheduled_date: "",
          email_opened_at: "",
          email_responded_at: "",
          notes: followUpContext || "",
        });
        setSelectedContactIds([]);
        setCompanySearch("");
      }
    }
  }, [open, companyId, companyName, contactIds, followUpContext]);

  useEffect(() => {
    if (debouncedSearch || open) {
      loadCompanies(debouncedSearch);
    }
  }, [debouncedSearch, open]);

  const loadCompanies = async (search: string = "") => {
    let query = supabase
      .from("companies")
      .select("id, company_name")
      .order("company_name");
    
    if (search) {
      query = query.ilike("company_name", `%${search}%`);
    }
    
    const { data } = await query.limit(50);
    if (data) setCompanies(data);
  };

  const { data: contacts } = useQuery({
    queryKey: ["contacts-for-company", formData.company_id],
    queryFn: async () => {
      if (!formData.company_id) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("company_id", formData.company_id)
        .order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: !!formData.company_id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // For meetings/demos with "Scheduled" outcome, don't set completed_date
      const isMeetingType = formData.activity_type === "Meeting" || formData.activity_type === "Demo";
      const isScheduled = formData.outcome === "Scheduled";
      
      // Create activity
      const { data: activity, error: activityError } = await supabase
        .from("outreach_activities")
        .insert({
          company_id: formData.company_id,
          activity_type: formData.activity_type as "Email" | "Phone" | "LinkedIn Connection" | "LinkedIn Message" | "Meeting" | "Demo" | "Training",
          subject_line: formData.subject_line,
          message_content: formData.message_content,
          outcome: formData.outcome as any,
          // Only set completed_date for non-meeting types OR completed meetings
          completed_date: (isMeetingType && isScheduled) ? null : (formData.completed_date || null),
          scheduled_date: formData.scheduled_date || null,
          email_opened_at: formData.email_opened_at || null,
          email_responded_at: formData.email_responded_at || null,
          notes: formData.notes,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (activityError) throw activityError;

      // Create contact associations
      if (selectedContactIds.length > 0) {
        const { error: contactsError } = await supabase
          .from("activity_contacts")
          .insert(
            selectedContactIds.map(contactId => ({
              activity_id: activity.id,
              contact_id: contactId,
            }))
          );

        if (contactsError) throw contactsError;
      }

      toast({
        title: "Success",
        description: "Activity logged successfully",
      });

      setFormData({
        company_id: "",
        activity_type: "Email",
        subject_line: "",
        message_content: "",
        outcome: "Completed",
        completed_date: new Date().toISOString().split("T")[0],
        scheduled_date: "",
        email_opened_at: "",
        email_responded_at: "",
        notes: "",
      });
      setSelectedContactIds([]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="company">Company *</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!!companyId}
                  className={cn(
                    "w-full justify-between",
                    !formData.company_id && "text-muted-foreground"
                  )}
                >
                  {formData.company_id
                    ? companies.find((company) => company.id === formData.company_id)?.company_name || companySearch
                    : "Search for a company..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search companies..." 
                    value={companySearch}
                    onValueChange={setCompanySearch}
                  />
                  <CommandList>
                    <CommandEmpty>No company found.</CommandEmpty>
                    <CommandGroup>
                      {companies.map((company) => (
                        <CommandItem
                          key={company.id}
                          value={company.company_name}
                          onSelect={() => {
                            setFormData((prev) => ({ ...prev, company_id: company.id, contact_id: "" }));
                            setCompanySearch(company.company_name);
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              company.id === formData.company_id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {company.company_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {formData.company_id && (
            <div>
              <Label htmlFor="contact">Contacts (Optional)</Label>
              <ContactMultiSelect
                contacts={contacts || []}
                selectedContactIds={selectedContactIds}
                onSelectedContactsChange={setSelectedContactIds}
                placeholder="Select contacts..."
              />
            </div>
          )}

          <div>
            <Label htmlFor="activity_type">Activity Type *</Label>
            <Select
              value={formData.activity_type}
              onValueChange={(value: any) => {
                // Auto-set outcome to "Scheduled" for meetings and clear completed_date
                const isMeetingType = value === "Meeting" || value === "Demo";
                setFormData((prev) => ({ 
                  ...prev, 
                  activity_type: value,
                  outcome: isMeetingType ? "Scheduled" : prev.outcome,
                  // Clear completed_date for meetings - it will be set when meeting is marked complete
                  completed_date: isMeetingType ? "" : prev.completed_date
                }));
              }}
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

          {/* Show scheduled date for meetings/demos */}
          {(formData.activity_type === "Meeting" || formData.activity_type === "Demo") && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Label htmlFor="scheduled_date" className="text-blue-700 dark:text-blue-300">
                Scheduled Date *
              </Label>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                When the meeting is scheduled to occur. You'll be prompted to complete it after this date.
              </p>
              <Input
                id="scheduled_date"
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, scheduled_date: e.target.value }))
                }
                className="border-blue-300 dark:border-blue-700"
                required
              />
            </div>
          )}

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

          {/* Only show outcome for non-meeting types */}
          {formData.activity_type !== "Meeting" && formData.activity_type !== "Demo" && (
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
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show date fields based on activity type */}
          {formData.activity_type !== "Meeting" && formData.activity_type !== "Demo" && (
            formData.activity_type === "Phone" ? (
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
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="completed_date">Sent Date *</Label>
                  <Input
                    id="completed_date"
                    type="datetime-local"
                    value={formData.completed_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, completed_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="email_opened_at">Opened Date</Label>
                  <Input
                    id="email_opened_at"
                    type="datetime-local"
                    value={formData.email_opened_at}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email_opened_at: e.target.value }))
                    }
                  />
                </div>
              </div>
            )
          )}

          {formData.activity_type === "Email" && (
            <div>
              <Label htmlFor="email_responded_at">Responded Date</Label>
              <Input
                id="email_responded_at"
                type="datetime-local"
                value={formData.email_responded_at}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email_responded_at: e.target.value }))
                }
              />
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

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.company_id}>
              {isSubmitting ? "Logging..." : "Log Activity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
