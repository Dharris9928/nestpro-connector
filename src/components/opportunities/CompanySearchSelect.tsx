import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
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

interface CompanySearchSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
}

export function CompanySearchSelect({ value, onValueChange }: CompanySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Fetch the selected company by ID
  const { data: selectedCompanyData } = useQuery({
    queryKey: ['company-by-id', value],
    queryFn: async () => {
      if (!value) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, city, state')
        .eq('id', value)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!value,
  });

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies-search', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('id, company_name, city, state')
        .order('company_name');

      if (debouncedSearch) {
        query = query.ilike('company_name', `%${debouncedSearch}%`);
      } else {
        // If no search, just return first 50 companies
        query = query.limit(50);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const selectedCompany = selectedCompanyData || companies?.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCompany
            ? `${selectedCompany.company_name} ${selectedCompany.city ? `- ${selectedCompany.city}, ${selectedCompany.state}` : ''}`
            : "Select company..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search companies..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading..." : "No company found."}
            </CommandEmpty>
            <CommandGroup>
              {companies?.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.id}
                  onSelect={() => {
                    onValueChange(company.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === company.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{company.company_name}</span>
                    {company.city && (
                      <span className="text-sm text-muted-foreground">
                        {company.city}, {company.state}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
