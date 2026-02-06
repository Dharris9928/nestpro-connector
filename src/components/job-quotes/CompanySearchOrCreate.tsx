import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CompanySearchOrCreateProps {
  value?: string;
  onChange: (value: string) => void;
  companyType: "Distributor" | "Wholesaler" | "Contractor";
  placeholder?: string;
}

const CONTRACTOR_INDUSTRY_TYPES = ['HVAC', 'Plumbing', 'Electrical', 'General Contractor', 'Home Builder'];

export function CompanySearchOrCreate({
  value,
  onChange,
  companyType,
  placeholder = "Search companies...",
}: CompanySearchOrCreateProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Search companies matching the type
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-search", companyType, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("id, company_name, industry_specialties, industry_type")
        .order("company_name");

      if (searchQuery) {
        query = query.ilike("company_name", `%${searchQuery}%`);
      }

      // Filter by type
      if (companyType === "Contractor") {
        query = query.in("industry_type", CONTRACTOR_INDUSTRY_TYPES);
      } else {
        query = query.contains("industry_specialties", [companyType]);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Also search all companies if no specialty match
  const { data: allCompanies = [] } = useQuery({
    queryKey: ["all-companies-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name, industry_specialties")
        .ilike("company_name", `%${searchQuery}%`)
        .order("company_name")
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!searchQuery && companies.length === 0,
  });

  const selectedCompany = [...companies, ...allCompanies].find(
    (c) => c.id === value
  );

  const createCompanyMutation = useMutation({
    mutationFn: async (companyName: string) => {
      if (!currentUser) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("companies")
        .insert({
          company_name: companyName,
          industry_type: companyType === "Contractor" ? "Contractor" : "Partner/Other",
          industry_specialties: companyType === "Contractor" ? [] : [companyType],
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companies-search"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      onChange(data.id);
      setOpen(false);
      toast({
        title: `${companyType} created`,
        description: `${data.company_name} has been added to your companies.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating company",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (searchQuery.trim()) {
      createCompanyMutation.mutate(searchQuery.trim());
    }
  };

  const displayCompanies = companies.length > 0 ? companies : allCompanies;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCompany ? (
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {selectedCompany.company_name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${companyType.toLowerCase()}s...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {searchQuery ? (
                    <div className="p-2">
                      <p className="text-sm text-muted-foreground mb-2">
                        No {companyType.toLowerCase()} found
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2">
                      Start typing to search...
                    </p>
                  )}
                </CommandEmpty>

                {displayCompanies.length > 0 && (
                  <CommandGroup heading={`${companyType}s`}>
                    {displayCompanies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={company.id}
                        onSelect={() => {
                          onChange(company.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === company.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        {company.company_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {searchQuery && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreate}
                        disabled={createCompanyMutation.isPending}
                      >
                        {createCompanyMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Create "{searchQuery}" as {companyType}
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
