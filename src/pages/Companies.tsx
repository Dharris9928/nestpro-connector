import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { CompanyTable } from "@/components/companies/CompanyTable";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { EditCompanyDialog } from "@/components/companies/EditCompanyDialog";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Companies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  const statusFilter = searchParams.get("status");
  const priorityFilter = searchParams.get("priority");
  const builderSegmentFilter = searchParams.get("builder_segment");
  const contractorSegmentFilter = searchParams.get("contractor_segment");

  const { data: companies, isLoading, refetch } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    
    let filtered = [...companies];
    
    if (statusFilter) {
      filtered = filtered.filter(company => company.status === statusFilter);
    }
    
    if (priorityFilter) {
      filtered = filtered.filter(company => company.priority_tier === priorityFilter);
    }

    if (builderSegmentFilter) {
      filtered = filtered.filter(company => company.builder_segment === builderSegmentFilter);
    }

    if (contractorSegmentFilter) {
      filtered = filtered.filter(company => company.contractor_segment === contractorSegmentFilter);
    }
    
    return filtered;
  }, [companies, statusFilter, priorityFilter, builderSegmentFilter, contractorSegmentFilter]);

  const clearFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground">
            Manage your builder and contractor accounts
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {(statusFilter || priorityFilter || builderSegmentFilter || contractorSegmentFilter) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {statusFilter && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("status");
                  setSearchParams(newParams);
                }}
              />
            </Badge>
          )}
          {priorityFilter && (
            <Badge variant="secondary" className="gap-1">
              Priority: {priorityFilter.split(":")[0]}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("priority");
                  setSearchParams(newParams);
                }}
              />
            </Badge>
          )}
          {builderSegmentFilter && (
            <Badge variant="secondary" className="gap-1">
              Builder: {builderSegmentFilter}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("builder_segment");
                  setSearchParams(newParams);
                }}
              />
            </Badge>
          )}
          {contractorSegmentFilter && (
            <Badge variant="secondary" className="gap-1">
              Contractor: {contractorSegmentFilter}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("contractor_segment");
                  setSearchParams(newParams);
                }}
              />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      <CompanyTable
        companies={filteredCompanies}
        isLoading={isLoading}
        onEdit={(company) => {
          setSelectedCompany(company);
          setIsEditDialogOpen(true);
        }}
      />

      <AddCompanyDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          refetch();
          setIsAddDialogOpen(false);
        }}
      />

      {selectedCompany && (
        <EditCompanyDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={() => {
            refetch();
            setIsEditDialogOpen(false);
          }}
          company={selectedCompany}
        />
      )}
    </div>
  );
};

export default Companies;
