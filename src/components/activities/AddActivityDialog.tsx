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

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  followUpContext?: string;
}

export function AddActivityDialog({
  open,
  onOpenChange,
  onSuccess,
  companyId,
  companyName,
  contactId,
  followUpContext,
}: AddActivityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);
  const debouncedSearch = useDebounce(companySearch, 300);
  const [formData, setFormData] = useState({
    company_id: "",
    contact_id: "",
    activity_type: "Email" as const,
    subject_line: "",
    message_content: "",
    outcome: "Completed" as const,
    completed_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadCompanies();
      if (companyId && companyName) {
        setFormData(prev => ({ 
          ...prev, 
          company_id: companyId,
          contact_id: contactId || "",
          notes: followUpContext || ""
        }));
        setCompanySearch(companyName);
      } else {
        setFormData({
          company_id: "",
          contact_id: "",
          activity_type: "Email",
          subject_line: "",
          message_content: "",
          outcome: "Completed",
          completed_date: new Date().toISOString().split("T")[0],
          notes: followUpContext || "",
        });
        setCompanySearch("");
      }
    }
  }, [open, companyId, companyName, contactId, followUpContext]);

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

      const { error } = await supabase.from("outreach_activities").insert({
        company_id: formData.company_id,
        contact_id: formData.contact_id || null,
        activity_type: formData.activity_type,
        subject_line: formData.subject_line,
        message_content: formData.message_content,
        outcome: formData.outcome,
        completed_date: formData.completed_date,
        notes: formData.notes,
        created_by: userData.user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity logged successfully",
      });

      setFormData({
        company_id: "",
        contact_id: "",
        activity_type: "Email",
        subject_line: "",
        message_content: "",
        outcome: "Completed",
        completed_date: new Date().toISOString().split("T")[0],
        notes: "",
      });

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
              <Label htmlFor="contact">Contact (Optional)</Label>
              <Select
                value={formData.contact_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, contact_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts?.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
