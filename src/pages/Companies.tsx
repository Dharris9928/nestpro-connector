import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Search, Download, Upload, Filter } from "lucide-react";
import { CompanyTable } from "@/components/companies/CompanyTable";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { EditCompanyDialog } from "@/components/companies/EditCompanyDialog";
import { CompaniesFilterSidebar } from "@/components/companies/CompaniesFilterSidebar";
import { BulkActionBar } from "@/components/companies/BulkActionBar";
import { TablePagination } from "@/components/companies/TablePagination";
import { ExportDialog } from "@/components/companies/ExportDialog";
import { ImportDialog } from "@/components/companies/ImportDialog";
import { AIImportDialog } from "@/components/companies/AIImportDialog";
import { ColumnCustomization, type ColumnVisibility } from "@/components/companies/ColumnCustomization";
import { SavedFilters } from "@/components/companies/SavedFilters";
import { AdvancedSearchDialog, type AdvancedFilter } from "@/components/companies/AdvancedSearchDialog";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { ViewSelector, ViewType } from "@/components/views/ViewSelector";
import { KanbanView } from "@/components/views/KanbanView";
import { CalendarView } from "@/components/views/CalendarView";
import { GalleryView } from "@/components/views/GalleryView";
import { ListView } from "@/components/views/ListView";
import { FormView } from "@/components/views/FormView";
import { CompanyHierarchyTree } from "@/components/companies/CompanyHierarchyTree";
import { useToast } from "@/hooks/use-toast";
import { PerspectiveSelector } from "@/components/common/PerspectiveSelector";
import { usePerspective } from "@/hooks/usePerspective";
import { useUserRole } from "@/hooks/useUserRole";

const Companies = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { perspective, setPerspective } = usePerspective('my_records');
  const { data: userRoleData } = useUserRole();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAIImportDialogOpen, setIsAIImportDialogOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get("search") || "";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentView, setCurrentView] = useState<ViewType>('grid');
  const [sortField, setSortField] = useState<string | null>(() => {
    return localStorage.getItem("companies-sort-field") || "lead_score";
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(() => {
    const saved = localStorage.getItem("companies-sort-direction");
    return (saved as 'asc' | 'desc' | null) || "desc";
  });
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    const saved = localStorage.getItem("companies-column-visibility");
    return saved ? JSON.parse(saved) : {
      companyName: true,
      type: true,
      segment: true,
      structure: false,
      parentCompany: false,
      contractorSpecialty: false,
      status: true,
      score: true,
      priority: true,
      annualVolume: false,
      revenue: false,
      phone: false,
      website: false,
      franchise: false,
    };
  });

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Persist column visibility
  useEffect(() => {
    localStorage.setItem("companies-column-visibility", JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const statusFilter = searchParams.get("status");
  const priorityFilter = searchParams.get("priority");
  const segmentFilter = searchParams.get("segment");
  const industryTypeFilter = searchParams.get("industry_type");
  const stateFilter = searchParams.get("state");
  const cityFilter = searchParams.get("city");
  const regionFilter = searchParams.get("region");
  const statesFilter = searchParams.get("states");
  const hasWebsiteFilter = searchParams.get("has_website");
  const hasLinkedinFilter = searchParams.get("has_linkedin");
  const hasPartnerFilter = searchParams.get("has_partner");
  const lastContactFilter = searchParams.get("last_contact");
  const enrichmentStatusFilter = searchParams.get("enrichment_status");
  const assignedToFilter = searchParams.get("assigned_to");

  // Persist sort selection
  useEffect(() => {
    if (sortField) {
      localStorage.setItem("companies-sort-field", sortField);
    }
    if (sortDirection) {
      localStorage.setItem("companies-sort-direction", sortDirection);
    }
  }, [sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Real-time subscription for companies
  useEffect(() => {
    const channel = supabase
      .channel('companies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'companies' },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Persist search in URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      newParams.set("search", debouncedSearch);
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams, { replace: true });
  }, [debouncedSearch]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [debouncedSearch, statusFilter, priorityFilter, segmentFilter, industryTypeFilter, stateFilter, cityFilter, regionFilter, statesFilter, enrichmentStatusFilter, assignedToFilter, perspective]);

  const { data: companies, isLoading, refetch } = useQuery({
    queryKey: ["companies", debouncedSearch, String(statusFilter || ''), String(priorityFilter || ''), String(segmentFilter || ''), String(industryTypeFilter || ''), String(stateFilter || ''), String(cityFilter || ''), String(regionFilter || ''), String(statesFilter || ''), String(enrichmentStatusFilter || ''), String(assignedToFilter || ''), perspective, JSON.stringify(advancedFilters)],
    queryFn: async () => {
      // Check for impersonation
      const impersonationData = sessionStorage.getItem('admin-impersonation');
      const impersonation = impersonationData ? JSON.parse(impersonationData) : null;
      
      let userId: string;
      if (impersonation?.userId) {
        userId = impersonation.userId;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        userId = user.id;
      }

      let query = supabase
        .from("companies")
        .select(`
          *,
          parent_company:companies!parent_company_id(id, company_name)
        `)
        .order("created_at", { ascending: false });

      // Apply perspective filter
      const hasElevatedAccess = userRoleData?.hasElevatedAccess || false;
      switch (perspective) {
        case 'my_records':
          query = query.eq('created_by', userId);
          break;
        case 'assigned_to_me':
          query = query.eq('assigned_to', userId);
          break;
        case 'my_team':
          if (userRoleData?.role === 'sales_manager') {
            // Get team member IDs
            const { data: teamMembers } = await supabase
              .from('team_memberships')
              .select('team_member_id')
              .eq('manager_id', userId)
              .eq('is_active', true);
            
            const teamIds = teamMembers?.map(m => m.team_member_id) || [];
            if (teamIds.length > 0) {
              query = query.in('created_by', teamIds);
            } else {
              // No team members, show nothing
              query = query.eq('created_by', '00000000-0000-0000-0000-000000000000');
            }
          }
          break;
        case 'all_records':
          // No filtering - all authenticated users can see all companies
          // Field-level permissions will control what data is visible
          break;
      }

      // Apply server-side search to ensure consistency with pickers
      if (debouncedSearch && debouncedSearch.length >= 2) {
        const s = debouncedSearch.replace(/[%_,]/g, ""); // sanitize wildcards
        query = query.or(
          `company_name.ilike.%${s}%,website_url.ilike.%${s}%,city.ilike.%${s}%,primary_phone.ilike.%${s}%,nest_pro_partner_id.ilike.%${s}%,linkedin_company_url.ilike.%${s}%`
        );
      }

      // Light server-side filtering for accuracy (mirrors UI filters)
      if (industryTypeFilter) query = query.eq('industry_type', industryTypeFilter);
      if (statusFilter) query = query.eq('status', statusFilter);
      if (priorityFilter) query = query.eq('priority_tier', priorityFilter);
      if (segmentFilter) query = query.eq('segment', segmentFilter);
      
      // Regional filters - TODO: Enable after database migration adds 'region' column
      // if (regionFilter) {
      //   const regions = regionFilter.split(',');
      //   query = query.in('region', regions);
      // }
      if (statesFilter) {
        const states = statesFilter.split(',');
        query = query.in('state', states);
      }

      // Apply assignee filter
      if (assignedToFilter) {
        query = query.eq('assigned_to_sales_rep_id', assignedToFilter);
      }

      // Apply enrichment status filter
      if (enrichmentStatusFilter === 'enriched') {
        const { data: enrichedIds } = await supabase
          .from('enrichment_logs')
          .select('company_id')
          .eq('status', 'success');
        
        if (enrichedIds && enrichedIds.length > 0) {
          const uniqueIds = [...new Set(enrichedIds.map(log => log.company_id))];
          query = query.in('id', uniqueIds);
        } else {
          return [];
        }
      } else if (enrichmentStatusFilter === 'not-enriched') {
        const { data: enrichedIds } = await supabase
          .from('enrichment_logs')
          .select('company_id')
          .eq('status', 'success');
        
        if (enrichedIds && enrichedIds.length > 0) {
          const uniqueIds = [...new Set(enrichedIds.map(log => log.company_id))];
          query = query.not('id', 'in', `(${uniqueIds.join(',')})`);
        }
      }

      // Note: Advanced filters applied client-side to avoid TypeScript issues

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch activities for calendar view
  const { data: activities } = useQuery({
    queryKey: ["outreach_activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_activities")
        .select(`
          *,
          company:companies(company_name)
        `)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: currentView === 'calendar',
  });

  // Handle navigation from reports with editCompanyId
  useEffect(() => {
    const state = location.state as { editCompanyId?: string };
    if (state?.editCompanyId && companies) {
      const company = companies.find(c => c.id === state.editCompanyId);
      if (company) {
        setSelectedCompany(company);
        setIsEditDialogOpen(true);
        // Clear the state
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, companies]);

  const filteredAndSortedCompanies = useMemo(() => {
    if (!companies) return [];
    
    let filtered = [...companies];
    
    // Apply search filter (minimum 2 characters)
    if (debouncedSearch && debouncedSearch.length >= 2) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter(company => 
        company.company_name?.toLowerCase().includes(search) ||
        company.website_url?.toLowerCase().includes(search) ||
        company.city?.toLowerCase().includes(search) ||
        company.primary_phone?.toLowerCase().includes(search) ||
        company.nest_pro_partner_id?.toLowerCase().includes(search) ||
        company.linkedin_company_url?.toLowerCase().includes(search)
      );
    }
    
    // Apply company type filter
    if (industryTypeFilter) {
      filtered = filtered.filter(company => company.industry_type === industryTypeFilter);
    }
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(company => company.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(company => company.priority_tier === priorityFilter);
    }

    // Apply segment filter (unified for both Builder and Contractor)
    if (segmentFilter) {
      filtered = filtered.filter(company => company.segment === segmentFilter);
    }
    
    // Note: State and city filters require company_branches data
    // These can be implemented when branches data is joined in the query
    
    // Apply data completeness filters
    if (hasWebsiteFilter === "true") {
      filtered = filtered.filter(company => company.website_url);
    }
    
    if (hasLinkedinFilter === "true") {
      filtered = filtered.filter(company => company.linkedin_company_url);
    }
    
    if (hasPartnerFilter === "true") {
      filtered = filtered.filter(company => company.nest_pro_partner_id);
    }
    
    // Apply sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortField as keyof typeof a];
        let bVal: any = b[sortField as keyof typeof b];
        
        // Handle null/undefined values
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        
        // Handle different data types
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' 
            ? aVal - bVal
            : bVal - aVal;
        } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          return sortDirection === 'asc'
            ? (aVal === bVal ? 0 : aVal ? 1 : -1)
            : (aVal === bVal ? 0 : bVal ? 1 : -1);
        }
        
        return 0;
      });
    }
    
    return filtered;
  }, [companies, debouncedSearch, statusFilter, priorityFilter, segmentFilter, industryTypeFilter, hasWebsiteFilter, hasLinkedinFilter, hasPartnerFilter, sortField, sortDirection]);

  // Paginated companies
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedCompanies.slice(startIndex, endIndex);
  }, [filteredAndSortedCompanies, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedCompanies.length / itemsPerPage);

  const clearFilters = () => {
    const newParams = new URLSearchParams();
    if (debouncedSearch) {
      newParams.set("search", debouncedSearch);
    }
    setSearchParams(newParams);
  };

  const applyFilters = (filters: any) => {
    const newParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        newParams.set(key, filters[key]);
      }
    });
    setSearchParams(newParams);
  };

  const currentFilters = {
    status: statusFilter,
    priority: priorityFilter,
    segment: segmentFilter,
    industry_type: industryTypeFilter,
    state: stateFilter,
    city: cityFilter,
  };

  const activeFilters = [
    industryTypeFilter && { type: "Industry", value: industryTypeFilter, key: "industry_type" },
    statusFilter && { type: "Status", value: statusFilter, key: "status" },
    priorityFilter && { type: "Priority", value: priorityFilter.split(":")[0], key: "priority" },
    segmentFilter && { type: "Segment", value: segmentFilter, key: "segment" },
    stateFilter && { type: "State", value: stateFilter, key: "state" },
    cityFilter && { type: "City", value: cityFilter, key: "city" },
    hasWebsiteFilter === "true" && { type: "Filter", value: "Has Website", key: "has_website" },
    hasLinkedinFilter === "true" && { type: "Filter", value: "Has LinkedIn", key: "has_linkedin" },
    hasPartnerFilter === "true" && { type: "Filter", value: "Has Partner", key: "has_partner" },
    lastContactFilter && { type: "Last Contact", value: lastContactFilter, key: "last_contact" },
    ...advancedFilters.map(f => f.field && f.operator ? { 
      type: "Advanced", 
      value: `${f.field} ${f.operator} ${f.value || ''}`.trim(), 
      key: `advanced_${f.id}`,
      isAdvanced: true,
      filterId: f.id
    } : null).filter(Boolean)
  ].filter(Boolean);

  const removeFilter = (key: string, filterId?: string) => {
    if (filterId) {
      // Remove advanced filter
      setAdvancedFilters(advancedFilters.filter(f => f.id !== filterId));
    } else {
      // Remove URL param filter
      const newParams = new URLSearchParams(searchParams);
      newParams.delete(key);
      setSearchParams(newParams);
    }
  };

  const handleApplyAdvancedFilters = (filters: AdvancedFilter[]) => {
    setAdvancedFilters(filters);
    setCurrentPage(1);
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters([]);
  };

  const handleUpdateCompany = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
      
      await refetch();
      toast({
        title: "Success",
        description: "Company updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update company",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("companies")
        .insert([{
          company_name: data.company_name,
          industry_type: data.industry_type,
          state: data.state,
          primary_email: data.email,
          primary_phone: data.phone,
          website_url: data.website,
          notes: data.notes,
          status: 'Lead',
          created_by: user.user?.id,
        }]);
      
      if (error) throw error;
      
      await refetch();
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <div className="border-b border-border bg-card px-6 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          {/* Perspective Selector */}
          <PerspectiveSelector 
            value={perspective}
            onChange={setPerspective}
          />

          {/* Search */}
          <div className="relative w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search companies, websites, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <p className="absolute left-0 top-full mt-1 text-xs text-muted-foreground">
                Type at least 2 characters to search
              </p>
            )}
          </div>

          {/* View Selector */}
          <ViewSelector 
            currentView={currentView} 
            onViewChange={setCurrentView}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsAdvancedSearchOpen(true)}
              className={advancedFilters.length > 0 ? "border-primary" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Advanced Search
              {advancedFilters.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {advancedFilters.length}
                </Badge>
              )}
            </Button>

            <SavedFilters
              currentFilters={currentFilters}
              onApplyFilter={applyFilters}
            />

            {currentView === 'grid' && (
              <ColumnCustomization
                visibility={columnVisibility}
                onChange={setColumnVisibility}
              />
            )}

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsExportDialogOpen(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsAIImportDialogOpen(true)}
              className="border-primary/50 hover:bg-primary/5"
            >
              <Upload className="h-4 w-4 mr-2" />
              AI Import
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Manual Import
            </Button>

            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {activeFilters.map((filter: any) => (
              <Badge 
                key={filter.key} 
                variant="secondary" 
                className="gap-1 cursor-pointer hover:bg-muted"
              >
                {filter.type}: {filter.value}
                <X 
                  className="h-3 w-3 hover:text-destructive" 
                  onClick={() => removeFilter(filter.key)}
                />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7">
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar */}
        <CompaniesFilterSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Table Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Result Count */}
          <div className="px-6 py-3 border-b border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{paginatedCompanies.length}</span> of{" "}
              <span className="font-medium text-foreground">{filteredAndSortedCompanies.length}</span> companies
              {debouncedSearch && debouncedSearch.length >= 2 && (
                <span className="ml-2">
                  matching "<span className="font-medium text-foreground">{debouncedSearch}</span>"
                </span>
              )}
            </p>
          </div>

          {/* Bulk Action Bar */}
          {selectedRows.length > 0 && (
            <BulkActionBar
              selectedCount={selectedRows.length}
              selectedIds={selectedRows}
              onClearSelection={() => setSelectedRows([])}
              onActionComplete={() => {
                refetch();
                setSelectedRows([]);
              }}
            />
          )}

          {/* View Content */}
          <div className="flex-1 overflow-auto p-6">
            {currentView === 'grid' && (
              <CompanyTable
                companies={paginatedCompanies}
                isLoading={isLoading}
                onEdit={(company) => {
                  setSelectedCompany(company);
                  setIsEditDialogOpen(true);
                }}
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
                onCompanyUpdate={refetch}
                columnVisibility={columnVisibility}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}

            {currentView === 'kanban' && (
              <KanbanView 
                data={filteredAndSortedCompanies}
                onUpdate={handleUpdateCompany}
                stackByField="status"
              />
            )}

            {currentView === 'calendar' && (
              <CalendarView 
                activities={activities || []}
              />
            )}

            {currentView === 'gallery' && (
              <GalleryView 
                data={filteredAndSortedCompanies}
                onSelectItem={(item) => {
                  setSelectedCompany(item);
                  setIsEditDialogOpen(true);
                }}
              />
            )}

            {currentView === 'list' && (
              <ListView 
                data={filteredAndSortedCompanies}
                onSelectItem={(item) => {
                  setSelectedCompany(item);
                  setIsEditDialogOpen(true);
                }}
              />
            )}

            {currentView === 'form' && (
              <FormView
                formTitle="New Company Inquiry"
                formDescription="Submit your information to get started with Google Nest Pro"
                fields={[
                  { name: 'company_name', label: 'Company Name', type: 'text', required: true, maxLength: 255 },
                  { 
                    name: 'industry_type', 
                    label: 'Industry', 
                    type: 'select', 
                    required: true, 
                    options: [
                      { value: 'Builder', label: 'Builder' },
                      { value: 'Contractor', label: 'Contractor' }
                    ]
                  },
                  { name: 'email', label: 'Email', type: 'email', required: true, maxLength: 255 },
                  { name: 'phone', label: 'Phone', type: 'phone', maxLength: 20 },
                  { name: 'state', label: 'State', type: 'text', required: true, maxLength: 2 },
                  { name: 'website', label: 'Website', type: 'text', maxLength: 500 },
                  { name: 'notes', label: 'Additional Information', type: 'textarea', maxLength: 1000 }
                ]}
                onSubmit={handleFormSubmit}
              />
            )}

            {currentView === 'hierarchy' && (
              <CompanyHierarchyTree />
            )}
          </div>

          {/* Pagination - only show for grid view */}
          {currentView === 'grid' && filteredAndSortedCompanies.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedCompanies.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      </div>

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
          companyId={selectedCompany.id}
        />
      )}

      <ExportDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        selectedIds={selectedRows.length > 0 ? selectedRows : null}
        filters={{
          status: statusFilter,
          priority: priorityFilter,
          segment: segmentFilter,
        }}
        totalCount={filteredAndSortedCompanies.length}
      />

      <ImportDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImportComplete={() => {
          refetch();
          setIsImportDialogOpen(false);
        }}
      />

      <AIImportDialog
        open={isAIImportDialogOpen}
        onClose={() => setIsAIImportDialogOpen(false)}
        onImportComplete={() => {
          refetch();
          setIsAIImportDialogOpen(false);
        }}
        targetTable="companies"
      />
    </div>
  );
};

export default Companies;
