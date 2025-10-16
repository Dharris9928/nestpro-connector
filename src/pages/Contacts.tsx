import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ContactTable } from "@/components/contacts/ContactTable";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";
import { EditContactDialog } from "@/components/contacts/EditContactDialog";
import { ImportContactsDialogEnhanced } from "@/components/contacts/ImportContactsDialogEnhanced";
import { ApolloContactImportDialog } from "@/components/contacts/ApolloContactImportDialog";
import { logBulkContactView } from "@/lib/contacts/logContactAccess";
import { PerspectiveSelector } from "@/components/common/PerspectiveSelector";
import { usePerspective } from "@/hooks/usePerspective";
import { useUserRole } from "@/hooks/useUserRole";

const Contacts = () => {
  const location = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const { perspective, setPerspective } = usePerspective('my_records');
  const { data: userRoleData } = useUserRole();

  const { data: contacts, isLoading, refetch } = useQuery({
    queryKey: ["contacts", perspective],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from("contacts")
        .select("*, companies(company_name, created_by, assigned_to)");

      // Apply perspective filter
      if (perspective === 'my_records') {
        query = query.eq('companies.created_by', user.id);
      } else if (perspective === 'assigned_to_me') {
        query = query.eq('companies.assigned_to', user.id);
      } else if (perspective === 'my_team') {
        if (userRoleData?.role === 'sales_manager') {
          const { data: teamMembers } = await supabase
            .from('team_memberships')
            .select('team_member_id')
            .eq('manager_id', user.id)
            .eq('is_active', true);
          
          const teamIds = teamMembers?.map(m => m.team_member_id) || [];
          if (teamIds.length > 0) {
            query = query.in('companies.created_by', teamIds);
          } else {
            query = query.eq('companies.created_by', '00000000-0000-0000-0000-000000000000');
          }
        }
      } else if (perspective === 'all_records' && !userRoleData?.hasElevatedAccess) {
        query = query.eq('companies.created_by', user.id);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      
      // Log bulk contact view for audit trail
      if (data && data.length > 0) {
        logBulkContactView(data.map(c => c.id));
      }
      
      return data;
    },
  });

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
          <ApolloContactImportDialog onSuccess={refetch} />
          <ImportContactsDialogEnhanced onSuccess={refetch} />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      <ContactTable
        contacts={contacts || []}
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
    </div>
  );
};

export default Contacts;
