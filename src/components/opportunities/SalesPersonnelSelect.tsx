import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";

interface SalesPersonnelSelectProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  companyId?: string;
}

export function SalesPersonnelSelect({ value, onValueChange, companyId }: SalesPersonnelSelectProps) {
  const [open, setOpen] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  // Fetch all contacts (not just from the selected company)
  const { data: contacts = [], refetch } = useQuery({
    queryKey: ['all-contacts-for-sales-personnel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, title, company_id, companies:company_id(company_name)')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
  });

  const selectedContact = contacts.find(c => c.id === value);

  const getDisplayName = (contact: typeof contacts[0]) => {
    const name = `${contact.first_name} ${contact.last_name}`;
    const company = (contact.companies as any)?.company_name;
    return company ? `${name} (${company})` : name;
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedContact ? getDisplayName(selectedContact) : "Select sales personnel..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Search contacts..." />
            <CommandList>
              <CommandEmpty>No contact found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onValueChange(undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-muted-foreground">None</span>
                </CommandItem>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={`${contact.first_name} ${contact.last_name} ${(contact.companies as any)?.company_name || ''}`}
                    onSelect={() => {
                      onValueChange(contact.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{contact.first_name} {contact.last_name}</span>
                      {contact.title && (
                        <span className="text-xs text-muted-foreground">{contact.title}</span>
                      )}
                      {(contact.companies as any)?.company_name && (
                        <span className="text-xs text-muted-foreground">
                          {(contact.companies as any)?.company_name}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowAddContact(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Contact
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AddContactDialog
        open={showAddContact}
        onOpenChange={setShowAddContact}
        companyId={companyId}
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
}
