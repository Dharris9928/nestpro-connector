import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Mail, Phone, Linkedin, Plus, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddContactDialog } from '@/components/contacts/AddContactDialog';
import { EditContactDialog } from '@/components/contacts/EditContactDialog';
import { useNavigate } from 'react-router-dom';

interface CompanyContactsListProps {
  companyId: string;
  companyName: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company_id: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  linkedin_url: string | null;
  linkedin_connections: number | null;
  decision_tier: string;
  preferred_contact_method: string;
  notes: string | null;
  created_at: string;
}

export function CompanyContactsList({ companyId, companyName }: CompanyContactsListProps) {
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const { data: contacts, isLoading, refetch } = useQuery({
    queryKey: ['company-contacts', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getDecisionTierColor = (tier: string) => {
    switch (tier) {
      case 'Decision Maker':
        return 'bg-red-500';
      case 'Influencer':
        return 'bg-yellow-500';
      case 'Gatekeeper':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading contacts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Contacts at {companyName}</CardTitle>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
          <CardDescription>
            {contacts?.length || 0} contact{contacts?.length === 1 ? '' : 's'} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contacts && contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-semibold text-lg text-foreground hover:text-primary"
                          onClick={() => setEditingContact(contact)}
                        >
                          {contact.first_name} {contact.last_name}
                        </Button>
                        <Badge className={getDecisionTierColor(contact.decision_tier)}>
                          {contact.decision_tier}
                        </Badge>
                      </div>
                      
                      {contact.title && (
                        <p className="text-sm text-muted-foreground">{contact.title}</p>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm">
                        {contact.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <a 
                              href={`mailto:${contact.email}`}
                              className="hover:text-primary hover:underline"
                            >
                              {contact.email}
                            </a>
                          </div>
                        )}
                        
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <a 
                              href={`tel:${contact.phone}`}
                              className="hover:text-primary hover:underline"
                            >
                              {contact.phone}
                            </a>
                          </div>
                        )}

                        {contact.mobile && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <a 
                              href={`tel:${contact.mobile}`}
                              className="hover:text-primary hover:underline"
                            >
                              {contact.mobile} (mobile)
                            </a>
                          </div>
                        )}
                        
                        {contact.linkedin_url && (
                          <div className="flex items-center gap-1">
                            <Linkedin className="h-3 w-3 text-blue-600" />
                            <a
                              href={contact.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              LinkedIn Profile
                            </a>
                          </div>
                        )}
                      </div>

                      {contact.linkedin_connections && (
                        <p className="text-xs text-muted-foreground">
                          LinkedIn Connections: {contact.linkedin_connections.toLocaleString()}
                        </p>
                      )}

                      {contact.notes && (
                        <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
                          {contact.notes}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingContact(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No contacts added yet for this company</p>
              <Button onClick={() => setShowAddDialog(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Contact
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddContactDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          refetch();
          setShowAddDialog(false);
        }}
        onAdded={() => {
          refetch();
        }}
        companyId={companyId}
        companyName={companyName}
      />

      {editingContact && (
        <EditContactDialog
          open={true}
          onOpenChange={(open) => !open && setEditingContact(null)}
          onSuccess={() => {
            refetch();
            setEditingContact(null);
          }}
          contact={editingContact}
        />
      )}
    </>
  );
}
