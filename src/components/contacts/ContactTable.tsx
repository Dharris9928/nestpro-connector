import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, Linkedin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

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
}

export function ContactTable({ contacts, isLoading, onEdit }: ContactTableProps) {
  const navigate = useNavigate();
  
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
            <TableHead>Name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Decision Tier</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-medium">
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium text-foreground hover:text-primary"
                  onClick={() => onEdit(contact)}
                >
                  {contact.first_name} {contact.last_name}
                </Button>
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
                <Button variant="ghost" size="sm" onClick={() => onEdit(contact)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
