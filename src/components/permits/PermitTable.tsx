import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Building, MapPin, Calendar, DollarSign, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { PermitDetailsDialog } from "./PermitDetailsDialog";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { getPermitUnits } from "@/lib/permits/permitUnits";

interface Permit {
  id: string;
  permit_number: string | null;
  project_name: string;
  builder_name: string | null;
  city: string;
  state: string;
  num_units: number | null;
  estimated_value: number | null;
  filed_date: string | null;
  status: string | null;
  is_matched_to_company: boolean;
  is_high_value: boolean;
  builder_company: any;
  raw_data?: any;
}

interface PermitTableProps {
  permits: Permit[];
  onRefetch: () => void;
}

const DEFAULT_WIDTHS: Record<string, number> = {
  project_name: 200,
  builder_name: 180,
  city: 160,
  num_units: 100,
  estimated_value: 130,
  filed_date: 130,
  status: 110,
  actions: 90,
};

export const PermitTable = ({ permits, onRefetch }: PermitTableProps) => {
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [sortField, setSortField] = useState<keyof Permit | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { columnWidths, handleMouseDown, totalWidth } = useResizableColumns(DEFAULT_WIDTHS);

  const handleSort = (field: keyof Permit) => {
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

  const sortedPermits = useMemo(() => {
    if (!sortField) return permits;

    return [...permits].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [permits, sortField, sortDirection]);

  const renderSortIcon = (field: keyof Permit) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 ml-1" /> : 
      <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const ResizableHeader = ({ field, sortable = true, children }: { field: string; sortable?: boolean; children: React.ReactNode }) => (
    <TableHead 
      style={{ width: columnWidths[field], minWidth: 60, maxWidth: columnWidths[field], position: 'relative' }}
      className="group select-none"
    >
      <div className="flex items-center justify-between pr-2">
        {sortable ? (
          <div 
            className="flex items-center cursor-pointer hover:text-foreground"
            onClick={() => handleSort(field as keyof Permit)}
          >
            {children}
            {renderSortIcon(field as keyof Permit)}
          </div>
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

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table style={{ tableLayout: 'fixed', width: totalWidth }}>
            <TableHeader>
              <TableRow>
                <ResizableHeader field="project_name">Project</ResizableHeader>
                <ResizableHeader field="builder_name">Builder</ResizableHeader>
                <ResizableHeader field="city">Location</ResizableHeader>
                <ResizableHeader field="num_units">Units</ResizableHeader>
                <ResizableHeader field="estimated_value">Value</ResizableHeader>
                <ResizableHeader field="filed_date">Filed Date</ResizableHeader>
                <ResizableHeader field="status">Status</ResizableHeader>
                <ResizableHeader field="actions" sortable={false}>Actions</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPermits.map((permit) => (
                <TableRow key={permit.id}>
                  <TableCell style={{ width: columnWidths.project_name, maxWidth: columnWidths.project_name }}>
                    <div className="space-y-1">
                      <div className="font-medium truncate" title={permit.project_name}>{permit.project_name}</div>
                      {permit.permit_number && (
                        <div className="text-xs text-muted-foreground truncate">
                          #{permit.permit_number}
                        </div>
                      )}
                      {permit.is_high_value && (
                        <Badge variant="destructive" className="text-xs">
                          High Value
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.builder_name, maxWidth: columnWidths.builder_name }}>
                    <div className="space-y-1">
                      {permit.builder_company ? (
                        <>
                          <div className="font-medium truncate" title={permit.builder_company.company_name}>{permit.builder_company.company_name}</div>
                          <Badge variant="secondary" className="text-xs">
                            Matched
                          </Badge>
                        </>
                      ) : (
                        <>
                          <div className="truncate" title={permit.builder_name || 'Unknown'}>{permit.builder_name || 'Unknown'}</div>
                          <Badge variant="outline" className="text-xs">
                            Unmatched
                          </Badge>
                        </>
                      )}
                      {permit.raw_data?.contractor?.permit_count != null && (
                        <div className="text-xs text-muted-foreground">
                          {Number(permit.raw_data.contractor.permit_count).toLocaleString()} permits on record
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.city, maxWidth: columnWidths.city }}>
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{permit.city}, {permit.state}</span>
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.num_units, maxWidth: columnWidths.num_units }}>
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                      {(() => {
                        const u = getPermitUnits(permit);
                        if (!u.units) return <span>N/A</span>;
                        return (
                          <span title={u.estimated ? "Counted from the permit details — Shovels doesn't list a unit count for this permit" : undefined}>
                            {u.estimated ? "~" : ""}{u.units.toLocaleString()}
                          </span>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.estimated_value, maxWidth: columnWidths.estimated_value }}>
                    <div className="flex items-center gap-1 truncate">
                      <DollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{formatCurrency(permit.estimated_value)}</span>
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.filed_date, maxWidth: columnWidths.filed_date }}>
                    <div className="flex items-center gap-1 text-sm truncate">
                      <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{formatDate(permit.filed_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell style={{ width: columnWidths.status, maxWidth: columnWidths.status }}>
                    {permit.status && (
                      <Badge variant="outline">{permit.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell style={{ width: columnWidths.actions, maxWidth: columnWidths.actions }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPermit(permit)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedPermit && (
        <PermitDetailsDialog
          permit={selectedPermit}
          open={!!selectedPermit}
          onOpenChange={(open) => !open && setSelectedPermit(null)}
          onUpdate={onRefetch}
        />
      )}
    </>
  );
};
