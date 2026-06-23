import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback, memo } from "react";
import { DeleteRecordDialog } from "@/components/common/DeleteRecordDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { ContactActivityDialog } from "./ContactActivityDialog";
import { useResizableColumns } from "@/hooks/useResizableColumns";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  decision_tier: string;
  company_id: string;
  assigned_to: string | null;
  companies?: {
    company_name: string;
  };
  assigned_profile?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface ContactTableProps {
  contacts: Contact[];
  isLoading: boolean;
  onEdit: (contact: Contact) => void;
  onDelete?: () => void;
}

const DEFAULT_WIDTHS: Record<string, number> = {
  name: 180,
  title: 160,
  company: 180,
  decision_tier: 130,
  assigned: 150,
  contact_info: 120,
  actions: 100,
};

const TIER_COLORS: Record<string, string> = {
  Primary: "bg-priority-p1 text-priority-p1-foreground",
  Secondary: "bg-priority-p2 text-priority-p2-foreground",
  Influencer: "bg-priority-p3 text-priority-p3-foreground",
};

interface ContactRowProps {
  contact: Contact;
  columnWidths: Record<string, number>;
  isAdmin: boolean;
  onOpenActivity: (contact: Contact) => void;
  onNavigateCompany: (companyId: string) => void;
  onEdit: (contact: Contact) => void;
  onRequestDelete: (contact: Contact) => void;
}

// Memoized row — re-renders only when its own props change, not when the
// parent re-renders due to unrelated state (e.g. typing in the search box).
const ContactRow = memo(function ContactRow({
  contact,
  columnWidths,
  isAdmin,
  onOpenActivity,
  onNavigateCompany,
  onEdit,
  onRequestDelete,
}: ContactRowProps) {
  const assignedName = contact.assigned_profile
    ? `${contact.assigned_profile.first_name} ${contact.assigned_profile.last_name}`
    : "";
  return (
    <TableRow>
      <TableCell style={{ width: columnWidths.name, maxWidth: columnWidths.name }} className="font-medium">
        <div className="truncate">
          <Button
            variant="link"
            className="p-0 h-auto font-medium text-foreground hover:text-primary"
            onClick={() => onOpenActivity(contact)}
          >
            {contact.first_name} {contact.last_name}
          </Button>
        </div>
      </TableCell>
      <TableCell style={{ width: columnWidths.title, maxWidth: columnWidths.title }} className="text-sm">
        <div className="truncate" title={contact.title || ''}>{contact.title || "—"}</div>
      </TableCell>
      <TableCell style={{ width: columnWidths.company, maxWidth: columnWidths.company }} className="text-sm">
        <div className="truncate">
          {contact.companies?.company_name ? (
            <Button
              variant="link"
              className="p-0 h-auto text-sm text-foreground hover:text-primary"
              onClick={() => onNavigateCompany(contact.company_id)}
            >
              {contact.companies.company_name}
            </Button>
          ) : (
            "—"
          )}
        </div>
      </TableCell>
      <TableCell style={{ width: columnWidths.decision_tier, maxWidth: columnWidths.decision_tier }}>
        <Badge className={TIER_COLORS[contact.decision_tier] || "bg-muted"}>
          {contact.decision_tier}
        </Badge>
      </TableCell>
      <TableCell style={{ width: columnWidths.assigned, maxWidth: columnWidths.assigned }} className="text-sm">
        <div className="truncate" title={assignedName}>{assignedName || "—"}</div>
      </TableCell>
      <TableCell style={{ width: columnWidths.contact_info, maxWidth: columnWidths.contact_info }}>
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
      <TableCell style={{ width: columnWidths.actions, maxWidth: columnWidths.actions }}>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(contact)}>
            <Edit className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRequestDelete(contact)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

export function ContactTable({ contacts, isLoading, onEdit, onDelete }: ContactTableProps) {
  const navigate = useNavigate();
  const { data: userData } = useUserRole();
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [activityContact, setActivityContact] = useState<Contact | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { columnWidths, handleMouseDown, totalWidth } = useResizableColumns(DEFAULT_WIDTHS);

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

  const ResizableHeader = ({ field, sortable = true, children }: { field: string; sortable?: boolean; children: React.ReactNode }) => (
    <TableHead style={{ width: columnWidths[field], minWidth: 60, maxWidth: columnWidths[field], position: 'relative' }} className="group">
      <div className="flex items-center justify-between pr-2">
        {sortable ? (
          <Button
            variant="ghost"
            onClick={() => handleSort(field)}
            className="h-auto p-0 hover:bg-transparent font-semibold truncate"
          >
            <span className="truncate">{children}</span>
            {renderSortIcon(field)}
          </Button>
        ) : (
          <span className="text-sm font-medium truncate">{children}</span>
        )}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-center justify-center z-10"
          onMouseDown={(e) => handleMouseDown(field, e)}
        >
          <div className="h-4 w-0.5 bg-border rounded-full" />
        </div>
      </div>
    </TableHead>
  );

  // Stable callbacks so memoized ContactRow doesn't re-render due to fresh
  // function identities on every parent render.
  const handleOpenActivity = useCallback((c: Contact) => setActivityContact(c), []);
  const handleNavigateCompany = useCallback(
    (companyId: string) => navigate('/companies', { state: { editCompanyId: companyId } }),
    [navigate]
  );
  const handleRequestDelete = useCallback((c: Contact) => setDeleteContact(c), []);
  // onEdit comes from parent; wrap once so memoized rows compare against the
  // same reference even if parent supplies a fresh closure each render.
  const stableOnEdit = useCallback((c: Contact) => onEdit(c), [onEdit]);

  const isAdmin = userData?.role === 'admin';

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
      <div className="overflow-x-auto">
        <Table style={{ tableLayout: 'fixed', width: totalWidth }}>
          <TableHeader>
            <TableRow>
              <ResizableHeader field="name">Name</ResizableHeader>
              <ResizableHeader field="title">Title</ResizableHeader>
              <ResizableHeader field="company">Company</ResizableHeader>
              <ResizableHeader field="decision_tier">Decision Tier</ResizableHeader>
              <ResizableHeader field="assigned" sortable={false}>Assigned To</ResizableHeader>
              <ResizableHeader field="contact_info" sortable={false}>Contact Info</ResizableHeader>
              <ResizableHeader field="actions" sortable={false}>Actions</ResizableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedContacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                columnWidths={columnWidths}
                isAdmin={isAdmin}
                onOpenActivity={handleOpenActivity}
                onNavigateCompany={handleNavigateCompany}
                onEdit={stableOnEdit}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>

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

      {activityContact && (
        <ContactActivityDialog
          open={!!activityContact}
          onOpenChange={(open) => !open && setActivityContact(null)}
          contact={activityContact}
        />
      )}
    </div>
  );
}
