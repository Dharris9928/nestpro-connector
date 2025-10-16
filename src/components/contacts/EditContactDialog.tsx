import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logSingleContactView } from "@/lib/contacts/logContactAccess";
import { Button } from "@/components/ui/button";
import { NewCommunicationDialog } from "@/components/companies/NewCommunicationDialog";
import { AddActivityDialog } from "@/components/activities/AddActivityDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Check, ChevronsUpDown, Mail, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company_id: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  linkedin_url: string | null;
  decision_tier: string;
  preferred_contact_method: string;
}

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  contact: Contact;
}

const decisionTiers = ["Primary", "Secondary", "Influencer"];
const contactMethods = ["Email", "Phone", "LinkedIn", "Text"];

export function EditContactDialog({ open, onOpenChange, onSuccess, contact }: EditContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);
  const debouncedSearch = useDebounce(companySearch, 300);
  const [openCommunicationDialog, setOpenCommunicationDialog] = useState(false);
  const [openActivityDialog, setOpenActivityDialog] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");
  const [formData, setFormData] = useState({
    first_name: contact.first_name,
    last_name: contact.last_name,
    title: contact.title || "",
    company_id: contact.company_id,
    email: contact.email || "",
    phone: contact.phone || "",
    mobile: contact.mobile || "",
    linkedin_url: contact.linkedin_url || "",
    decision_tier: contact.decision_tier,
    preferred_contact_method: contact.preferred_contact_method,
  });

  useEffect(() => {
    if (open) {
      loadCompanies();
      loadInitialCompanyName();
      // Log contact access when dialog opens
      logSingleContactView(contact.id);
    }
  }, [open, contact.id]);

  useEffect(() => {
    if (debouncedSearch || open) {
      loadCompanies(debouncedSearch);
    }
  }, [debouncedSearch, open]);

  const loadInitialCompanyName = async () => {
    const { data } = await supabase
      .from("companies")
      .select("company_name")
      .eq("id", contact.company_id)
      .single();
    if (data) {
      setCompanySearch(data.company_name);
      setCompanyName(data.company_name);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        title: formData.title || null,
        company_id: formData.company_id,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        linkedin_url: formData.linkedin_url || null,
        decision_tier: formData.decision_tier as "Primary" | "Secondary" | "Influencer",
        preferred_contact_method: formData.preferred_contact_method as "Email" | "Phone" | "LinkedIn" | "Text",
      };

      const { error } = await supabase
        .from("contacts")
        .update(updateData)
        .eq("id", contact.id);

      if (error) throw error;

      toast.success("Contact updated successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>
                Update contact details and company association.
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenCommunicationDialog(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Communication
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenActivityDialog(true)}
              >
                <Activity className="h-4 w-4 mr-2" />
                Log Activity
              </Button>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company_id">Company *</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "justify-between",
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
                              setFormData({ ...formData, company_id: company.id });
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
            <div className="grid gap-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="decision_tier">Decision Tier</Label>
              <Select
                value={formData.decision_tier}
                onValueChange={(value) => setFormData({ ...formData, decision_tier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {decisionTiers.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
              <Select
                value={formData.preferred_contact_method}
                onValueChange={(value) => setFormData({ ...formData, preferred_contact_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <NewCommunicationDialog
        open={openCommunicationDialog}
        onOpenChange={setOpenCommunicationDialog}
        prefilledCompanyId={contact.company_id}
        prefilledContactId={contact.id}
        onSuccess={() => {
          toast.success("Communication generated successfully!");
          setOpenCommunicationDialog(false);
        }}
      />

      <AddActivityDialog
        open={openActivityDialog}
        onOpenChange={setOpenActivityDialog}
        companyId={contact.company_id}
        companyName={companyName}
        onSuccess={() => {
          toast.success("Activity logged successfully!");
          setOpenActivityDialog(false);
        }}
      />
    </Dialog>
  );
}
