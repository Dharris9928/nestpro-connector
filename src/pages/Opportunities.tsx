import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddOpportunityDialog } from "@/components/opportunities/AddOpportunityDialog";
import { OpportunitiesTable } from "@/components/opportunities/OpportunitiesTable";
import { ViewSelector, ViewType } from "@/components/views/ViewSelector";
import { OpportunitiesKanbanView } from "@/components/opportunities/OpportunitiesKanbanView";
import { OpportunitiesCalendarView } from "@/components/opportunities/OpportunitiesCalendarView";
import { OpportunitiesGalleryView } from "@/components/opportunities/OpportunitiesGalleryView";
import { OpportunitiesListView } from "@/components/opportunities/OpportunitiesListView";
import { FormView } from "@/components/views/FormView";
import { useToast } from "@/hooks/use-toast";
import { EditOpportunityDialog } from "@/components/opportunities/EditOpportunityDialog";
import { PerspectiveSelector } from "@/components/common/PerspectiveSelector";
import { usePerspective } from "@/hooks/usePerspective";
import { useUserRole } from "@/hooks/useUserRole";
import { RegionalFilterDialog, RegionalFilters } from "@/components/common/RegionalFilterDialog";

export default function Opportunities() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRegionalDialogOpen, setIsRegionalDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>('grid');
  const [regionalFilters, setRegionalFilters] = useState<RegionalFilters | null>(null);
  const { perspective, setPerspective } = usePerspective('my_records');
  const { data: userRoleData } = useUserRole();

  const { data: opportunities, isLoading, refetch } = useQuery({
    queryKey: ['opportunities', perspective, regionalFilters, userRoleData?.hasElevatedAccess ?? 'unknown'],
    queryFn: async () => {
      // Check for impersonation
      const impersonationData = sessionStorage.getItem('admin-impersonation');
      const impersonation = impersonationData ? JSON.parse(impersonationData) : null;
      
      let userId: string;
      if (impersonation?.userId) {
        userId = impersonation.userId;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
      }

      let query = supabase
        .from('opportunities' as any)
        .select('*, companies!opportunities_company_id_fkey(company_name, state, city), profiles!opportunities_assigned_to_fkey(first_name, last_name), opportunity_products(*)');

      // Apply perspective filter
      if (perspective === 'my_records') {
        query = query.eq('created_by', userId);
      } else if (perspective === 'assigned_to_me') {
        query = query.eq('assigned_to', userId);
      } else if (perspective === 'my_team') {
        if (userRoleData?.role === 'sales_manager') {
          const { data: teamMembers } = await supabase
            .from('team_memberships')
            .select('team_member_id')
            .eq('manager_id', userId)
            .eq('is_active', true);
          
          const teamIds = teamMembers?.map(m => m.team_member_id) || [];
          if (teamIds.length > 0) {
            query = query.in('created_by', teamIds);
          } else {
            query = query.eq('created_by', '00000000-0000-0000-0000-000000000000');
          }
        }
      } else if (perspective === 'all_records' && userRoleData?.hasElevatedAccess === false) {
        query = query.eq('created_by', userId);
      }

      // Apply regional filters
      if (regionalFilters) {
        if (regionalFilters.states && regionalFilters.states.length > 0) {
          query = query.in('companies.state', regionalFilters.states);
        }
        if (regionalFilters.metros && regionalFilters.metros.length > 0) {
          query = query.in('companies.city', regionalFilters.metros);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) { console.error('Failed to fetch opportunities:', error); throw error; }
      return data as any;
    },
  });

  const handleUpdateOpportunity = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('opportunities' as any)
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      await refetch();
      toast({
        title: "Success",
        description: "Opportunity updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update opportunity",
        variant: "destructive",
      });
    }
  };

  const handleSelectOpportunity = (opportunity: any) => {
    setSelectedOpportunity(opportunity);
    setIsEditDialogOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('opportunities' as any)
        .insert([{
          opportunity_name: data.opportunity_name,
          company_id: data.company_id,
          stage: data.stage || 'prospecting',
          amount: data.amount,
          expected_close_date: data.expected_close_date,
          notes: data.notes,
          created_by: user.user?.id,
        }]);
      
      if (error) throw error;
      
      await refetch();
      toast({
        title: "Success",
        description: "Opportunity created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create opportunity",
        variant: "destructive",
      });
    }
  };

  const renderView = () => {
    if (isLoading) return <OpportunitiesTable opportunities={[]} isLoading={true} />;
    
    const data = opportunities || [];
    
    switch (currentView) {
      case 'kanban':
        return <OpportunitiesKanbanView opportunities={data} onUpdate={handleUpdateOpportunity} />;
      case 'calendar':
        return <OpportunitiesCalendarView opportunities={data} onSelectEvent={handleSelectOpportunity} />;
      case 'gallery':
        return <OpportunitiesGalleryView opportunities={data} onSelectItem={handleSelectOpportunity} />;
      case 'list':
        return <OpportunitiesListView opportunities={data} onSelectItem={handleSelectOpportunity} />;
      case 'form':
        return <FormView 
          formTitle="Create New Opportunity"
          formDescription="Fill out the form below to create a new sales opportunity"
          fields={[
            { name: 'opportunity_name', label: 'Opportunity Name', type: 'text', required: true },
            { name: 'company_id', label: 'Company ID', type: 'text', required: true, helpText: 'Enter the company UUID' },
            { 
              name: 'stage', 
              label: 'Stage', 
              type: 'select', 
              required: true,
              options: [
                { value: 'prospecting', label: 'Prospecting' },
                { value: 'qualification', label: 'Qualification' },
                { value: 'proposal', label: 'Proposal' },
                { value: 'negotiation', label: 'Negotiation' },
                { value: 'closed_won', label: 'Closed Won' },
                { value: 'closed_lost', label: 'Closed Lost' },
              ]
            },
            { name: 'amount', label: 'Estimated Value', type: 'number', placeholder: '0' },
            { name: 'expected_close_date', label: 'Expected Close Date', type: 'text', placeholder: 'YYYY-MM-DD' },
            { name: 'notes', label: 'Notes', type: 'textarea', maxLength: 500 },
          ]}
          onSubmit={handleFormSubmit}
          successMessage="Opportunity created successfully!"
        />;
      case 'grid':
      default:
        return <OpportunitiesTable opportunities={data} isLoading={false} onSelectOpportunity={handleSelectOpportunity} />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">
            Manage sales opportunities and track product quotes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PerspectiveSelector value={perspective} onChange={setPerspective} />
          <Button 
            variant="outline"
            onClick={() => setIsRegionalDialogOpen(true)}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Regional Filter
          </Button>
          <ViewSelector 
            currentView={currentView} 
            onViewChange={setCurrentView}
          />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Opportunity
          </Button>
        </div>
      </div>

      {/* Active Regional Filters */}
      {regionalFilters && (regionalFilters.states?.length || regionalFilters.metros?.length) ? (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active Filters:</span>
          {regionalFilters.states?.map(state => (
            <Badge key={state} variant="secondary" className="gap-1">
              {state}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setRegionalFilters(prev => ({
                  ...prev!,
                  states: prev!.states?.filter(s => s !== state)
                }))}
              />
            </Badge>
          ))}
          {regionalFilters.metros?.map(metro => (
            <Badge key={metro} variant="secondary" className="gap-1">
              {metro}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setRegionalFilters(prev => ({
                  ...prev!,
                  metros: prev!.metros?.filter(m => m !== metro)
                }))}
              />
            </Badge>
          ))}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setRegionalFilters(null)}
          >
            Clear All
          </Button>
        </div>
      ) : null}

      {renderView()}

      <AddOpportunityDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {selectedOpportunity && (
        <EditOpportunityDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          opportunity={selectedOpportunity}
        />
      )}

      <RegionalFilterDialog
        open={isRegionalDialogOpen}
        onOpenChange={setIsRegionalDialogOpen}
        onApplyFilters={setRegionalFilters}
        initialFilters={regionalFilters || undefined}
      />
    </div>
  );
}
