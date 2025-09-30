import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { QuickActionsMenu } from "./QuickActionsMenu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColumnVisibility } from "./ColumnCustomization";

interface Company {
  id: string;
  company_name: string;
  industry_type: string;
  builder_segment: string | null;
  contractor_segment: string | null;
  status: string;
  lead_score: number;
  priority_tier: string | null;
  website_url: string | null;
  primary_phone: string | null;
  is_franchise: boolean;
  parent_company_id: string | null;
  is_favorite?: boolean;
}

interface CompanyTableProps {
  companies: Company[];
  isLoading: boolean;
  onEdit: (company: Company) => void;
  selectedRows: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onCompanyUpdate: () => void;
  columnVisibility: ColumnVisibility;
}

export function CompanyTable({ 
  companies, 
  isLoading, 
  onEdit, 
  selectedRows, 
  onSelectionChange,
  onCompanyUpdate,
  columnVisibility 
}: CompanyTableProps) {
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const { toast } = useToast();
  const allSelected = companies.length > 0 && selectedRows.length === companies.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < companies.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(companies.map(c => c.id));
    }
  };

  const handleSelectRow = (companyId: string) => {
    if (selectedRows.includes(companyId)) {
      onSelectionChange(selectedRows.filter(id => id !== companyId));
    } else {
      onSelectionChange([...selectedRows, companyId]);
    }
  };

  const handleStatusChange = async (companyId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({ status: newStatus } as any)
        .eq("id", companyId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: "Company status has been updated",
      });

      onCompanyUpdate();
      setEditingStatus(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleFavoriteToggle = async (companyId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({ is_favorite: !currentFavorite } as any)
        .eq("id", companyId);

      if (error) throw error;

      toast({
        title: currentFavorite ? "Removed from Favorites" : "Added to Favorites",
        description: currentFavorite ? "Company removed from favorites" : "Company added to favorites",
      });

      onCompanyUpdate();
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };
  const getPriorityColor = (tier: string | null) => {
    if (!tier) return "bg-muted";
    if (tier.includes("P1")) return "bg-priority-p1 text-priority-p1-foreground";
    if (tier.includes("P2")) return "bg-priority-p2 text-priority-p2-foreground";
    if (tier.includes("P3")) return "bg-priority-p3 text-priority-p3-foreground";
    return "bg-muted";
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      Lead: "bg-status-lead",
      Contacted: "bg-status-contacted",
      Engaged: "bg-status-engaged",
      Pilot: "bg-status-pilot",
      Active: "bg-status-active",
      Inactive: "bg-status-inactive",
      Lost: "bg-status-lost",
    };
    return statusMap[status] || "bg-muted";
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading companies...</p>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-12 border border-border rounded-lg">
        <p className="text-muted-foreground">No companies found. Add your first company to get started!</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected || someSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
              {columnVisibility.companyName && <TableHead>Company Name</TableHead>}
              {columnVisibility.type && <TableHead>Type</TableHead>}
              {columnVisibility.segment && <TableHead>Segment</TableHead>}
              {columnVisibility.status && <TableHead>Status</TableHead>}
              {columnVisibility.score && <TableHead>Score</TableHead>}
              {columnVisibility.priority && <TableHead>Priority</TableHead>}
              {columnVisibility.phone && <TableHead>Phone</TableHead>}
              {columnVisibility.website && <TableHead>Website</TableHead>}
              {columnVisibility.franchise && <TableHead>Franchise</TableHead>}
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(company.id)}
                    onCheckedChange={() => handleSelectRow(company.id)}
                  />
                </TableCell>
                
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleFavoriteToggle(company.id, company.is_favorite || false)}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            company.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{company.is_favorite ? "Remove from favorites" : "Add to favorites"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                
                {columnVisibility.companyName && (
                  <TableCell className="font-medium">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">{company.company_name}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click actions menu to view details</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                )}
              
              {columnVisibility.type && (
                <TableCell>
                  <Badge variant="outline">{company.industry_type}</Badge>
                </TableCell>
              )}
              
              {columnVisibility.segment && (
                <TableCell className="text-sm">
                  {company.builder_segment || company.contractor_segment}
                </TableCell>
              )}
              
              {columnVisibility.status && (
                <TableCell>
                  {editingStatus === company.id ? (
                    <Select
                      defaultValue={company.status}
                      onValueChange={(value) => handleStatusChange(company.id, value)}
                    >
                      <SelectTrigger className="w-32 h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Engaged">Engaged</SelectItem>
                        <SelectItem value="Pilot">Pilot</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge 
                      className={`${getStatusColor(company.status)} cursor-pointer`}
                      onClick={() => setEditingStatus(company.id)}
                    >
                      {company.status}
                    </Badge>
                  )}
                </TableCell>
              )}
              {columnVisibility.score && (
                <TableCell>
                  <div 
                    className={`text-center font-semibold ${
                      company.lead_score >= 80 ? 'text-priority-p1' :
                      company.lead_score >= 60 ? 'text-priority-p2' :
                      company.lead_score >= 40 ? 'text-priority-p3' :
                      'text-muted-foreground'
                    }`}
                  >
                    {company.lead_score || 0}
                  </div>
                </TableCell>
              )}
              
              {columnVisibility.priority && (
                <TableCell>
                  <Badge 
                    className={
                      company.priority_tier === 'P1' ? 'bg-priority-p1 text-priority-p1-foreground' :
                      company.priority_tier === 'P2' ? 'bg-priority-p2 text-priority-p2-foreground' :
                      company.priority_tier === 'P3' ? 'bg-priority-p3 text-priority-p3-foreground' :
                      'bg-muted text-muted-foreground'
                    }
                  >
                    {company.priority_tier || 'Unscored'}
                  </Badge>
                </TableCell>
              )}

              {columnVisibility.phone && (
                <TableCell className="text-sm">{company.primary_phone || "-"}</TableCell>
              )}

              {columnVisibility.website && (
                <TableCell>
                  {company.website_url ? (
                    <a 
                      href={company.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Visit
                    </a>
                  ) : "-"}
                </TableCell>
              )}

              {columnVisibility.franchise && (
                <TableCell>
                  {company.is_franchise ? (
                    <Badge variant="secondary" className="text-xs">Franchise</Badge>
                  ) : "-"}
                </TableCell>
              )}
              
              <TableCell>
                <QuickActionsMenu
                  company={company}
                  onEdit={() => onEdit(company)}
                  onDelete={onCompanyUpdate}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  );
}
