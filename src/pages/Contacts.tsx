import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ContactTable } from "@/components/contacts/ContactTable";
import { AddContactDialog } from "@/components/contacts/AddContactDialog";
import { EditContactDialog } from "@/components/contacts/EditContactDialog";
import { ImportContactsDialog } from "@/components/contacts/ImportContactsDialog";
import { ApolloContactImportDialog } from "@/components/contacts/ApolloContactImportDialog";
import { logBulkContactView } from "@/lib/contacts/logContactAccess";

const Contacts = () => {
  const location = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const { data: contacts, isLoading, refetch } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies(company_name)")
        .order("created_at", { ascending: false });
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
          <ApolloContactImportDialog onSuccess={refetch} />
          <ImportContactsDialog onSuccess={refetch} />
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
