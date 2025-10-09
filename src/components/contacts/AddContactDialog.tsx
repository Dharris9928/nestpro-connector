import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { contactSchema, type ContactFormData } from "@/lib/validation/schemas";
import { createContact } from "@/lib/contacts/createContact";
import { useDebounce } from "@/hooks/useDebounce";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId?: string;
  companyName?: string;
}

const decisionTiers = ["Primary", "Secondary", "Influencer"];
const contactMethods = ["Email", "Phone", "LinkedIn", "Text"];

export function AddContactDialog({ open, onOpenChange, onSuccess, companyId, companyName }: AddContactDialogProps) {
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);
  const debouncedSearch = useDebounce(companySearch, 300);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      title: "",
      company_id: "",
      email: "",
      phone: "",
      mobile: "",
      linkedin_url: "",
      decision_tier: "Influencer",
      preferred_contact_method: "Email",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      loadCompanies();
      // Pre-fill company if provided
      if (companyId && companyName) {
        form.setValue("company_id", companyId);
        setCompanySearch(companyName);
      } else {
        form.reset();
        setCompanySearch("");
      }
    }
  }, [open, companyId, companyName]);

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

  const onSubmit = async (data: ContactFormData, shouldAddAnother: boolean) => {
    try {
      await createContact(data);
      toast.success("Contact added successfully!");
      
      if (shouldAddAnother) {
        // Reset form but keep company selection
        const currentCompanyId = form.getValues("company_id");
        const currentCompanySearch = companySearch;
        form.reset({
          first_name: "",
          last_name: "",
          title: "",
          company_id: companyId || currentCompanyId,
          email: "",
          phone: "",
          mobile: "",
          linkedin_url: "",
          decision_tier: "Influencer",
          preferred_contact_method: "Email",
          notes: "",
        });
        if (companyId) {
          setCompanySearch(companyName || "");
        } else {
          setCompanySearch(currentCompanySearch);
        }
        // Refresh the list but keep dialog open
        onSuccess();
      } else {
        // Only close dialog when not adding another
        onSuccess();
        form.reset();
        setCompanySearch("");
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add contact");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Enter contact details and associate with a company.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Company *</FormLabel>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={!!companyId}
                            className={cn(
                              "justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? companies.find((company) => company.id === field.value)?.company_name || companySearch
                              : "Search for a company..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
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
                                    form.setValue("company_id", company.id);
                                    setCompanySearch(company.company_name);
                                    setOpenCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      company.id === field.value
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="decision_tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decision Tier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {decisionTiers.map((tier) => (
                          <SelectItem key={tier} value={tier}>
                            {tier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl>
                      <Input type="url" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="preferred_contact_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contactMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                disabled={form.formState.isSubmitting}
                onClick={form.handleSubmit((data) => onSubmit(data, true))}
              >
                {form.formState.isSubmitting ? "Saving..." : "Save & Add Another"}
              </Button>
              <Button 
                type="button" 
                disabled={form.formState.isSubmitting}
                onClick={form.handleSubmit((data) => onSubmit(data, false))}
              >
                {form.formState.isSubmitting ? "Adding..." : "Add Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
