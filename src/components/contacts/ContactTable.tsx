import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, Linkedin, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { DeleteRecordDialog } from "@/components/common/DeleteRecordDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  decision_tier: string;
  company_id: string;
  companies?: {
    company_name: string;
  };
}

interface ContactTableProps {
  contacts: Contact[];
  isLoading: boolean;
  onEdit: (contact: Contact) => void;
  onDelete?: () => void;
}

export function ContactTable({ contacts, isLoading, onEdit, onDelete }: ContactTableProps) {
  const navigate = useNavigate();
  const { data: userData } = useUserRole();
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedContacts = useMemo(() => {
    if (!sortField) return contacts;

    return [...contacts].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'title':
          aValue = (a.title || '').toLowerCase();
          bValue = (b.title || '').toLowerCase();
          break;
        case 'company':
          aValue = (a.companies?.company_name || '').toLowerCase();
          bValue = (b.companies?.company_name || '').toLowerCase();
          break;
        case 'decision_tier':
          aValue = a.decision_tier.toLowerCase();
          bValue = b.decision_tier.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [contacts, sortField, sortDirection]);

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => handleSort(field)}
        className="h-auto p-0 hover:bg-transparent font-semibold"
      >
        {children}
        {renderSortIcon(field)}
      </Button>
    </TableHead>
  );

  const getTierColor = (tier: string) => {
    const tierMap: Record<string, string> = {
      Primary: "bg-priority-p1 text-priority-p1-foreground",
      Secondary: "bg-priority-p2 text-priority-p2-foreground",
      Influencer: "bg-priority-p3 text-priority-p3-foreground",
    };
    return tierMap[tier] || "bg-muted";
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading contacts...</p>
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="text-center py-12 border border-border rounded-lg">
        <p className="text-muted-foreground">No contacts found. Add your first contact to get started!</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="name">Name</SortableHeader>
            <SortableHeader field="title">Title</SortableHeader>
            <SortableHeader field="company">Company</SortableHeader>
            <SortableHeader field="decision_tier">Decision Tier</SortableHeader>
            <TableHead>Contact Info</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-medium">
                {contact.first_name} {contact.last_name}
              </TableCell>
              <TableCell className="text-sm">{contact.title || "—"}</TableCell>
              <TableCell className="text-sm">
                {contact.companies?.company_name ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm text-foreground hover:text-primary"
                    onClick={() => navigate('/companies', { state: { editCompanyId: contact.company_id } })}
                  >
                    {contact.companies.company_name}
                  </Button>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <Badge className={getTierColor(contact.decision_tier)}>
                  {contact.decision_tier}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {contact.email && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`mailto:${contact.email}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {contact.phone && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`tel:${contact.phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(contact)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {userData?.role === 'admin' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setDeleteContact(contact)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {deleteContact && (
        <DeleteRecordDialog
          open={!!deleteContact}
          onOpenChange={(open) => !open && setDeleteContact(null)}
          onSuccess={() => {
            setDeleteContact(null);
            onDelete?.();
          }}
          tableName="contacts"
          recordId={deleteContact.id}
          recordName={`${deleteContact.first_name} ${deleteContact.last_name}`}
          recordDetails={{
            title: deleteContact.title,
            email: deleteContact.email,
            company: deleteContact.companies?.company_name,
          }}
        />
      )}
    </div>
  );
}
