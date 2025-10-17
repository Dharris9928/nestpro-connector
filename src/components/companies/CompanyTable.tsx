import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, Star, Building2, Users, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { QuickActionsMenu } from "./QuickActionsMenu";
import { EnrichmentStatusBadge } from "./EnrichmentStatusBadge";
import { ProtectedField } from "@/components/common/ProtectedField";
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
  segment: string | null;
  status: string;
  lead_score: number;
  priority_tier: string | null;
  website_url: string | null;
  primary_phone: string | null;
  is_franchise: boolean;
  parent_company_id: string | null;
  company_type: string | null;
  contractor_specialty: string | null;
  nest_pro_partner_id: string | null;
  is_favorite?: boolean;
  annual_volume: number | null;
  annual_revenue_range: string | null;
  average_home_price?: number | null;
  parent_company?: {
    id: string;
    company_name: string;
  } | null;
}

interface CompanyTableProps {
  companies: Company[];
  isLoading: boolean;
  onEdit: (company: Company) => void;
  selectedRows: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onCompanyUpdate: () => void;
  columnVisibility: ColumnVisibility;
  sortField: string | null;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (field: string) => void;
}

export function CompanyTable({ 
  companies, 
  isLoading, 
  onEdit, 
  selectedRows, 
  onSelectionChange,
  onCompanyUpdate,
  columnVisibility,
  sortField,
  sortDirection,
  onSort
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

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const SortableHeader = ({ field, children, className = "" }: { field: string; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 hover:bg-transparent"
        onClick={() => onSort(field)}
      >
        {children}
        {renderSortIcon(field)}
      </Button>
    </TableHead>
  );

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
              {columnVisibility.companyName && <SortableHeader field="company_name">Company Name</SortableHeader>}
              <SortableHeader field="ai_status">AI Status</SortableHeader>
              {columnVisibility.type && <SortableHeader field="industry_type">Type</SortableHeader>}
              {columnVisibility.segment && <SortableHeader field="segment">Segment</SortableHeader>}
              {columnVisibility.structure && <SortableHeader field="company_type">Structure</SortableHeader>}
              {columnVisibility.parentCompany && <SortableHeader field="parent_company">Parent Company</SortableHeader>}
              {columnVisibility.contractorSpecialty && <SortableHeader field="contractor_specialty">Specialty</SortableHeader>}
              {columnVisibility.contractorSpecialty && <SortableHeader field="nest_pro_partner_id">Nest Pro ID</SortableHeader>}
              {columnVisibility.status && <SortableHeader field="status">Status</SortableHeader>}
              {columnVisibility.score && <SortableHeader field="lead_score">Score</SortableHeader>}
              {columnVisibility.priority && <SortableHeader field="priority_tier">Priority</SortableHeader>}
              {columnVisibility.annualVolume && <SortableHeader field="annual_volume">Annual Volume</SortableHeader>}
              {columnVisibility.revenue && <SortableHeader field="annual_revenue_range">Price/Revenue</SortableHeader>}
              {columnVisibility.phone && <SortableHeader field="primary_phone">Phone</SortableHeader>}
              {columnVisibility.website && <SortableHeader field="website_url">Website</SortableHeader>}
              {columnVisibility.franchise && <SortableHeader field="is_franchise">Franchise</SortableHeader>}
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow 
                key={company.id}
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => onEdit(company)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedRows.includes(company.id)}
                    onCheckedChange={() => handleSelectRow(company.id)}
                  />
                </TableCell>
                
                <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <button 
                      className="text-primary hover:underline text-left flex items-center gap-2"
                      onClick={() => onEdit(company)}
                    >
                      <ProtectedField
                        tableName="companies"
                        fieldName="company_name"
                        value={company.company_name}
                        showLockIcon={false}
                        recordId={company.id}
                        recordName={company.company_name}
                        enableAccessRequest={true}
                      />
                    </button>
                  </TableCell>
                )}

                <TableCell>
                  <EnrichmentStatusBadge companyId={company.id} />
                </TableCell>
              
              {columnVisibility.type && (
                <TableCell>
                  <Badge variant="outline">{company.industry_type}</Badge>
                </TableCell>
              )}
              
              {columnVisibility.segment && (
                <TableCell className="text-sm">
                  {company.segment}
                </TableCell>
              )}
              
              {columnVisibility.structure && (
                <TableCell>
                  {company.company_type === 'parent' ? (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-600">Parent</span>
                    </div>
                  ) : company.company_type === 'subsidiary' ? (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-purple-600" />
                      <span className="text-xs text-purple-600">Subsidiary</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              
              {columnVisibility.parentCompany && (
                <TableCell>
                  {company.parent_company ? (
                    <span className="text-sm text-primary">
                      {company.parent_company.company_name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              
              {columnVisibility.contractorSpecialty && (
                <TableCell>
                  {company.industry_type === 'Contractor' && company.contractor_specialty ? (
                    <div className="max-w-xs">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-foreground line-clamp-2 cursor-help">
                            {company.contractor_specialty}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{company.contractor_specialty}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ) : company.industry_type === 'Contractor' ? (
                    <span className="text-muted-foreground text-sm italic">Not specified</span>
                  ) : null}
                </TableCell>
              )}

              {columnVisibility.contractorSpecialty && (
                <TableCell>
                  {company.industry_type === 'Contractor' && company.nest_pro_partner_id ? (
                    <span className="text-sm font-mono text-foreground">{company.nest_pro_partner_id}</span>
                  ) : company.industry_type === 'Contractor' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : null}
                </TableCell>
              )}
              
              {columnVisibility.status && (
                <TableCell onClick={(e) => e.stopPropagation()}>
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

              {columnVisibility.annualVolume && (
                <TableCell>
                  <ProtectedField
                    tableName="companies"
                    fieldName="annual_volume"
                    value={company.annual_volume ? `${company.annual_volume.toLocaleString()} ${company.industry_type === 'Builder' ? 'homes' : 'calls'}/yr` : '-'}
                  >
                    {company.annual_volume ? (
                      <div className="text-sm">
                        <span className="font-semibold">{company.annual_volume.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-1">
                          {company.industry_type === 'Builder' ? 'homes' : 'calls'}/yr
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </ProtectedField>
                </TableCell>
              )}

              {columnVisibility.revenue && (
                <TableCell>
                  <ProtectedField
                    tableName="companies"
                    fieldName={company.industry_type === 'Builder' ? 'average_home_price' : 'annual_revenue_range'}
                    value={
                      company.industry_type === 'Builder' && company.average_home_price 
                        ? `$${(company.average_home_price / 1000).toFixed(0)}K avg`
                        : company.industry_type === 'Contractor' && company.annual_revenue_range
                        ? company.annual_revenue_range
                        : '-'
                    }
                  >
                    {company.industry_type === 'Builder' && company.average_home_price ? (
                      <div className="text-sm">
                        <span className="font-semibold">
                          ${(company.average_home_price / 1000).toFixed(0)}K
                        </span>
                        <span className="text-muted-foreground ml-1">avg</span>
                      </div>
                    ) : company.industry_type === 'Contractor' && company.annual_revenue_range ? (
                      <span className="text-sm">{company.annual_revenue_range}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </ProtectedField>
                </TableCell>
              )}

              {columnVisibility.phone && (
                <TableCell className="text-sm">
                  <ProtectedField
                    tableName="companies"
                    fieldName="primary_phone"
                    value={company.primary_phone}
                  />
                </TableCell>
              )}

              {columnVisibility.website && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ProtectedField
                    tableName="companies"
                    fieldName="website_url"
                    value={company.website_url}
                  >
                    {company.website_url ? (
                      <a 
                        href={company.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </ProtectedField>
                </TableCell>
              )}

              {columnVisibility.franchise && (
                <TableCell>
                  {company.is_franchise ? (
                    <Badge variant="secondary" className="text-xs">Franchise</Badge>
                  ) : "-"}
                </TableCell>
              )}
              
              <TableCell onClick={(e) => e.stopPropagation()}>
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
