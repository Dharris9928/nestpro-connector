import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Star, Building2, Users, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { useState, useCallback, memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColumnVisibility } from "./ColumnCustomization";
import { useResizableColumns } from "@/hooks/useResizableColumns";

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

const DEFAULT_WIDTHS: Record<string, number> = {
  checkbox: 48,
  favorite: 48,
  company_name: 200,
  ai_status: 100,
  industry_type: 120,
  segment: 120,
  company_type: 120,
  parent_company: 150,
  contractor_specialty: 140,
  nest_pro_partner_id: 120,
  status: 110,
  lead_score: 80,
  priority_tier: 100,
  annual_volume: 130,
  annual_revenue_range: 130,
  primary_phone: 130,
  website_url: 90,
  is_franchise: 90,
  actions: 60,
};

const STATUS_COLORS: Record<string, string> = {
  Lead: "bg-status-lead",
  Contacted: "bg-status-contacted",
  Engaged: "bg-status-engaged",
  Pilot: "bg-status-pilot",
  Active: "bg-status-active",
  Inactive: "bg-status-inactive",
  Lost: "bg-status-lost",
};

interface CompanyRowProps {
  company: Company;
  columnVisibility: ColumnVisibility;
  columnWidths: Record<string, number>;
  isSelected: boolean;
  isEditingStatus: boolean;
  onToggleSelect: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onStartEditStatus: (id: string) => void;
  onStatusChange: (id: string, value: string) => void;
  onEdit: (company: Company) => void;
  onCompanyUpdate: () => void;
}

// Memoized row — re-renders only when its own props change, not on every
// parent render (e.g. typing in the search input). Selection is passed as a
// primitive boolean rather than the full selectedRows array so unrelated
// rows aren't invalidated when any single row's selection toggles.
const CompanyRow = memo(function CompanyRow({
  company,
  columnVisibility,
  columnWidths,
  isSelected,
  isEditingStatus,
  onToggleSelect,
  onToggleFavorite,
  onStartEditStatus,
  onStatusChange,
  onEdit,
  onCompanyUpdate,
}: CompanyRowProps) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-accent/50"
      onClick={() => onEdit(company)}
    >
      <TableCell style={{ width: columnWidths.checkbox, maxWidth: columnWidths.checkbox }} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(company.id)}
        />
      </TableCell>

      <TableCell style={{ width: columnWidths.favorite, maxWidth: columnWidths.favorite }} onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleFavorite(company.id, company.is_favorite || false)}
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
        <TableCell style={{ width: columnWidths.company_name, maxWidth: columnWidths.company_name }} className="font-medium">
          <div className="truncate">
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
          </div>
        </TableCell>
      )}

      <TableCell style={{ width: columnWidths.ai_status, maxWidth: columnWidths.ai_status }}>
        <EnrichmentStatusBadge companyId={company.id} />
      </TableCell>

      {columnVisibility.type && (
        <TableCell style={{ width: columnWidths.industry_type, maxWidth: columnWidths.industry_type }}>
          <div className="truncate"><Badge variant="outline">{company.industry_type}</Badge></div>
        </TableCell>
      )}

      {columnVisibility.segment && (
        <TableCell style={{ width: columnWidths.segment, maxWidth: columnWidths.segment }} className="text-sm">
          <div className="truncate" title={company.segment || ''}>{company.segment}</div>
        </TableCell>
      )}

      {columnVisibility.structure && (
        <TableCell style={{ width: columnWidths.company_type, maxWidth: columnWidths.company_type }}>
          {company.company_type === 'parent' ? (
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-blue-600 shrink-0" />
              <span className="text-xs font-semibold text-blue-600">Parent</span>
            </div>
          ) : company.company_type === 'subsidiary' ? (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-purple-600 shrink-0" />
              <span className="text-xs text-purple-600">Subsidiary</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      )}

      {columnVisibility.parentCompany && (
        <TableCell style={{ width: columnWidths.parent_company, maxWidth: columnWidths.parent_company }}>
          {company.parent_company ? (
            <div className="truncate text-sm text-primary" title={company.parent_company.company_name}>
              {company.parent_company.company_name}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      )}

      {columnVisibility.contractorSpecialty && (
        <TableCell style={{ width: columnWidths.contractor_specialty, maxWidth: columnWidths.contractor_specialty }}>
          {company.industry_type === 'Contractor' && company.contractor_specialty ? (
            <div className="truncate" title={company.contractor_specialty}>
              <span className="text-sm text-foreground">
                {company.contractor_specialty}
              </span>
            </div>
          ) : company.industry_type === 'Contractor' ? (
            <span className="text-muted-foreground text-sm italic">Not specified</span>
          ) : null}
        </TableCell>
      )}

      {columnVisibility.contractorSpecialty && (
        <TableCell style={{ width: columnWidths.nest_pro_partner_id, maxWidth: columnWidths.nest_pro_partner_id }}>
          {company.industry_type === 'Contractor' && company.nest_pro_partner_id ? (
            <span className="text-sm font-mono text-foreground truncate">{company.nest_pro_partner_id}</span>
          ) : company.industry_type === 'Contractor' ? (
            <span className="text-muted-foreground">—</span>
          ) : null}
        </TableCell>
      )}

      {columnVisibility.status && (
        <TableCell style={{ width: columnWidths.status, maxWidth: columnWidths.status }} onClick={(e) => e.stopPropagation()}>
          {isEditingStatus ? (
            <Select
              defaultValue={company.status}
              onValueChange={(value) => onStatusChange(company.id, value)}
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
              className={`${STATUS_COLORS[company.status] || "bg-muted"} cursor-pointer`}
              onClick={() => onStartEditStatus(company.id)}
            >
              {company.status}
            </Badge>
          )}
        </TableCell>
      )}
      {columnVisibility.score && (
        <TableCell style={{ width: columnWidths.lead_score, maxWidth: columnWidths.lead_score }}>
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
        <TableCell style={{ width: columnWidths.priority_tier, maxWidth: columnWidths.priority_tier }}>
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
        <TableCell style={{ width: columnWidths.annual_volume, maxWidth: columnWidths.annual_volume }}>
          <ProtectedField
            tableName="companies"
            fieldName="annual_volume"
            value={company.annual_volume ? `${company.annual_volume.toLocaleString()} ${company.industry_type === 'Builder' ? 'homes' : 'calls'}/yr` : '-'}
          >
            {company.annual_volume ? (
              <div className="text-sm truncate">
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
        <TableCell style={{ width: columnWidths.annual_revenue_range, maxWidth: columnWidths.annual_revenue_range }}>
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
              <div className="text-sm truncate">
                <span className="font-semibold">
                  ${(company.average_home_price / 1000).toFixed(0)}K
                </span>
                <span className="text-muted-foreground ml-1">avg</span>
              </div>
            ) : company.industry_type === 'Contractor' && company.annual_revenue_range ? (
              <span className="text-sm truncate">{company.annual_revenue_range}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </ProtectedField>
        </TableCell>
      )}

      {columnVisibility.phone && (
        <TableCell style={{ width: columnWidths.primary_phone, maxWidth: columnWidths.primary_phone }} className="text-sm">
          <div className="truncate">
            <ProtectedField
              tableName="companies"
              fieldName="primary_phone"
              value={company.primary_phone}
            />
          </div>
        </TableCell>
      )}

      {columnVisibility.website && (
        <TableCell style={{ width: columnWidths.website_url, maxWidth: columnWidths.website_url }} onClick={(e) => e.stopPropagation()}>
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
        <TableCell style={{ width: columnWidths.is_franchise, maxWidth: columnWidths.is_franchise }}>
          {company.is_franchise ? (
            <Badge variant="secondary" className="text-xs">Franchise</Badge>
          ) : "-"}
        </TableCell>
      )}

      <TableCell style={{ width: columnWidths.actions, maxWidth: columnWidths.actions }} onClick={(e) => e.stopPropagation()}>
        <QuickActionsMenu
          company={company}
          onEdit={() => onEdit(company)}
          onDelete={onCompanyUpdate}
        />
      </TableCell>
    </TableRow>
  );
});

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
  const { columnWidths, handleMouseDown, totalWidth } = useResizableColumns(DEFAULT_WIDTHS);
  const allSelected = companies.length > 0 && selectedRows.length === companies.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < companies.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(companies.map(c => c.id));
    }
  };

  // Stable per-row callbacks so memoized CompanyRow doesn't re-render on
  // unrelated parent state changes.
  const handleSelectRow = useCallback((companyId: string) => {
    onSelectionChange(
      selectedRows.includes(companyId)
        ? selectedRows.filter(id => id !== companyId)
        : [...selectedRows, companyId]
    );
  }, [selectedRows, onSelectionChange]);

  const handleStatusChange = useCallback(async (companyId: string, newStatus: string) => {
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
  }, [toast, onCompanyUpdate]);

  const handleFavoriteToggle = useCallback(async (companyId: string, currentFavorite: boolean) => {
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
  }, [toast, onCompanyUpdate]);

  const handleStartEditStatus = useCallback((id: string) => setEditingStatus(id), []);
  const stableOnEdit = useCallback((c: Company) => onEdit(c), [onEdit]);
  const stableOnUpdate = useCallback(() => onCompanyUpdate(), [onCompanyUpdate]);

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const ResizableHeader = ({ field, sortable = true, children }: { field: string; sortable?: boolean; children: React.ReactNode }) => (
    <TableHead style={{ width: columnWidths[field], minWidth: 60, maxWidth: columnWidths[field], position: 'relative' }} className="group">
      <div className="flex items-center justify-between pr-2">
        {sortable ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 hover:bg-transparent truncate"
            onClick={() => onSort(field)}
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
        <div className="overflow-x-auto">
          <Table style={{ tableLayout: 'fixed', width: totalWidth }}>
            <TableHeader>
              <TableRow>
                <ResizableHeader field="checkbox" sortable={false}>
                  <Checkbox
                    checked={allSelected || someSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </ResizableHeader>
                <ResizableHeader field="favorite" sortable={false}>{""}</ResizableHeader>
                {columnVisibility.companyName && <ResizableHeader field="company_name">Company Name</ResizableHeader>}
                <ResizableHeader field="ai_status" sortable={false}>AI Status</ResizableHeader>
                {columnVisibility.type && <ResizableHeader field="industry_type">Type</ResizableHeader>}
                {columnVisibility.segment && <ResizableHeader field="segment">Segment</ResizableHeader>}
                {columnVisibility.structure && <ResizableHeader field="company_type">Structure</ResizableHeader>}
                {columnVisibility.parentCompany && <ResizableHeader field="parent_company">Parent Company</ResizableHeader>}
                {columnVisibility.contractorSpecialty && <ResizableHeader field="contractor_specialty">Specialty</ResizableHeader>}
                {columnVisibility.contractorSpecialty && <ResizableHeader field="nest_pro_partner_id">Nest Pro ID</ResizableHeader>}
                {columnVisibility.status && <ResizableHeader field="status">Status</ResizableHeader>}
                {columnVisibility.score && <ResizableHeader field="lead_score">Score</ResizableHeader>}
                {columnVisibility.priority && <ResizableHeader field="priority_tier">Priority</ResizableHeader>}
                {columnVisibility.annualVolume && <ResizableHeader field="annual_volume">Annual Volume</ResizableHeader>}
                {columnVisibility.revenue && <ResizableHeader field="annual_revenue_range">Price/Revenue</ResizableHeader>}
                {columnVisibility.phone && <ResizableHeader field="primary_phone">Phone</ResizableHeader>}
                {columnVisibility.website && <ResizableHeader field="website_url">Website</ResizableHeader>}
                {columnVisibility.franchise && <ResizableHeader field="is_franchise">Franchise</ResizableHeader>}
                <ResizableHeader field="actions" sortable={false}>Actions</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  columnVisibility={columnVisibility}
                  columnWidths={columnWidths}
                  isSelected={selectedRows.includes(company.id)}
                  isEditingStatus={editingStatus === company.id}
                  onToggleSelect={handleSelectRow}
                  onToggleFavorite={handleFavoriteToggle}
                  onStartEditStatus={handleStartEditStatus}
                  onStatusChange={handleStatusChange}
                  onEdit={stableOnEdit}
                  onCompanyUpdate={stableOnUpdate}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
