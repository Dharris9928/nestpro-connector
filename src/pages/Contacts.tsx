import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin } from "lucide-react";
import { ExternalContactSearchPanel } from "@/components/contacts/ExternalContactSearchPanel";
import { ContactTable } from "@/components/contacts/ContactTable";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";
import { EditContactDialog } from "@/components/contacts/EditContactDialog";
import { ImportContactsDialogEnhanced } from "@/components/contacts/ImportContactsDialogEnhanced";
import { ApolloContactImportDialog } from "@/components/contacts/ApolloContactImportDialog";
import { AIImportDialog } from "@/components/companies/AIImportDialog";
import { logBulkContactView } from "@/lib/contacts/logContactAccess";
import { PerspectiveSelector } from "@/components/common/PerspectiveSelector";
import { usePerspective } from "@/hooks/usePerspective";
import { useDebounce } from "@/hooks/useDebounce";
import { useUserRole } from "@/hooks/useUserRole";
import { RegionalFilterDialog, RegionalFilters } from "@/components/common/RegionalFilterDialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { WEST_STATES, EAST_STATES } from "@/lib/regions/regionConstants";

const Contacts = () => {
  const location = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAIImportDialogOpen, setIsAIImportDialogOpen] = useState(false);
  const [isRegionalDialogOpen, setIsRegionalDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionalFilters, setRegionalFilters] = useState<RegionalFilters | null>(null);
  const { perspective, setPerspective } = usePerspective('my_records');
  const { data: userRoleData } = useUserRole();
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: contacts, isLoading, refetch } = useQuery({
    queryKey: ["contacts", perspective, regionalFilters, debouncedSearch],
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
        .from("contacts")
        .select("*, companies(company_name, created_by, assigned_to, state, city)");

      // Apply perspective filter
      if (perspective === 'my_records') {
        query = query.eq('companies.created_by', userId);
      } else if (perspective === 'assigned_to_me') {
        query = query.eq('companies.assigned_to', userId);
      } else if (perspective === 'my_team') {
        if (userRoleData?.role === 'sales_manager') {
          const { data: teamMembers } = await supabase
            .from('team_memberships')
            .select('team_member_id')
            .eq('manager_id', userId)
            .eq('is_active', true);
          
          const teamIds = teamMembers?.map(m => m.team_member_id) || [];
          if (teamIds.length > 0) {
            query = query.in('companies.created_by', teamIds);
          } else {
            query = query.eq('companies.created_by', '00000000-0000-0000-0000-000000000000');
          }
        }
      } else if (perspective === 'all_records' && !userRoleData?.hasElevatedAccess) {
        query = query.eq('companies.created_by', userId);
      }

      // Apply regional filters - convert regions to states
      if (regionalFilters) {
        // First check for region-based filtering (East/West)
        if (regionalFilters.regions && regionalFilters.regions.length > 0) {
          const regionStates: string[] = [];
          regionalFilters.regions.forEach(region => {
            if (region === 'West') regionStates.push(...WEST_STATES);
            if (region === 'East') regionStates.push(...EAST_STATES);
          });
          if (regionStates.length > 0) {
            query = query.in('companies.state', regionStates);
          }
        }
        // Also support direct state selection
        if (regionalFilters.states && regionalFilters.states.length > 0) {
          query = query.in('companies.state', regionalFilters.states);
        }
        if (regionalFilters.metros && regionalFilters.metros.length > 0) {
          query = query.in('companies.city', regionalFilters.metros);
        }
      }

      // Apply server-side search filter when search term exists
      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},title.ilike.${term}`);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      
      // Log bulk contact view for audit trail
      if (data && data.length > 0) {
        logBulkContactView(data.map(c => c.id));
      }
      
      return data;
    },
  });

  // Filter contacts based on search term
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!searchTerm.trim()) return contacts;

    const term = searchTerm.toLowerCase();
    return contacts.filter((contact: any) => {
      const firstName = contact.first_name?.toLowerCase() || "";
      const lastName = contact.last_name?.toLowerCase() || "";
      const email = contact.email?.toLowerCase() || "";
      const title = contact.title?.toLowerCase() || "";
      const companyName = contact.companies?.company_name?.toLowerCase() || "";

      return (
        firstName.includes(term) ||
        lastName.includes(term) ||
        `${firstName} ${lastName}`.includes(term) ||
        email.includes(term) ||
        title.includes(term) ||
        companyName.includes(term)
      );
    });
  }, [contacts, searchTerm]);

  // Handle navigation from reports with editContactId
  useEffect(() => {
    const state = location.state as { editContactId?: string };
    if (state?.editContactId && contacts) {
      const contact = contacts.find(c => c.id === state.editContactId);
      if (contact) {
        setSelectedContact(contact);
        setIsEditDialogOpen(true);
        // Clear the state
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, contacts]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground">
            Manage decision makers and key contacts
          </p>
        </div>
        <div className="flex gap-2">
          <PerspectiveSelector value={perspective} onChange={setPerspective} />
          <Button 
            variant="outline"
            onClick={() => setIsRegionalDialogOpen(true)}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Regional Filter
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsAIImportDialogOpen(true)}
            className="border-primary/50 hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            AI Import
          </Button>
          <ApolloContactImportDialog onSuccess={refetch} />
          <ImportContactsDialogEnhanced onSuccess={refetch} />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
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

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts by name, email, title, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* External Search Panel */}
      <ExternalContactSearchPanel
        searchTerm={searchTerm}
        localResultsCount={filteredContacts.length}
        onContactImported={refetch}
      />

      <ContactTable
        contacts={filteredContacts}
        isLoading={isLoading}
        onEdit={(contact) => {
          setSelectedContact(contact);
          setIsEditDialogOpen(true);
        }}
        onDelete={() => refetch()}
      />

      <AddContactDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          refetch();
          setIsAddDialogOpen(false);
        }}
        onAdded={() => {
          refetch();
        }}
      />

      {selectedContact && (
        <EditContactDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={() => {
            refetch();
            setIsEditDialogOpen(false);
          }}
          contact={selectedContact}
        />
      )}

      <AIImportDialog
        open={isAIImportDialogOpen}
        onClose={() => setIsAIImportDialogOpen(false)}
        onImportComplete={() => {
          refetch();
          setIsAIImportDialogOpen(false);
        }}
        targetTable="contacts"
      />

      <RegionalFilterDialog
        open={isRegionalDialogOpen}
        onOpenChange={setIsRegionalDialogOpen}
        onApplyFilters={setRegionalFilters}
        initialFilters={regionalFilters || undefined}
      />
    </div>
  );
};

export default Contacts;
