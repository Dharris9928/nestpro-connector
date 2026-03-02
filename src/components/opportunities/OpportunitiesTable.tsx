import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface Opportunity {
  id: string;
  opportunity_name: string;
  stage: string;
  amount: number | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  company_id: string;
  assigned_to: string | null;
  assigned_to_sales_rep_id: string | null;
  companies?: { company_name: string } | null;
  profiles?: { first_name: string; last_name: string } | null;
  sales_reps?: { first_name: string; last_name: string } | null;
  opportunity_products?: any[];
}

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  isLoading: boolean;
  onSelectOpportunity?: (opportunity: Opportunity) => void;
}

const statusColors: Record<string, string> = {
  prospecting: "bg-blue-600 !text-white",
  qualification: "bg-amber-500 !text-white",
  proposal: "bg-violet-600 !text-white",
  negotiation: "bg-orange-600 !text-white",
  closed_won: "bg-emerald-600 !text-white",
  closed_lost: "bg-red-600 !text-white",
};

const DEFAULT_WIDTHS: Record<string, number> = {
  name: 200,
  company: 160,
  stage: 130,
  products: 180,
  amount: 120,
  assigned: 150,
  close_date: 140,
  notes: 220,
};

export function OpportunitiesTable({ opportunities, isLoading, onSelectOpportunity }: OpportunitiesTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS);
  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback((col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[col] || DEFAULT_WIDTHS[col];
    resizingRef.current = { col, startX, startWidth };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = ev.clientX - resizingRef.current.startX;
      const newWidth = Math.max(80, resizingRef.current.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizingRef.current!.col]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  const getAssigneeName = (opportunity: Opportunity) => {
    if (opportunity.profiles) {
      return `${opportunity.profiles.first_name} ${opportunity.profiles.last_name}`;
    }
    if (opportunity.sales_reps) {
      return `${opportunity.sales_reps.first_name} ${opportunity.sales_reps.last_name}`;
    }
    return "Unassigned";
  };

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

  const sortedOpportunities = useMemo(() => {
    if (!sortField) return opportunities;

    return [...opportunities].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.opportunity_name.toLowerCase();
          bValue = b.opportunity_name.toLowerCase();
          break;
        case 'company':
          aValue = (a.companies?.company_name || '').toLowerCase();
          bValue = (b.companies?.company_name || '').toLowerCase();
          break;
        case 'stage':
          aValue = a.stage.toLowerCase();
          bValue = b.stage.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount ?? 0;
          bValue = b.amount ?? 0;
          break;
        case 'close_date':
          aValue = a.expected_close_date ? new Date(a.expected_close_date).getTime() : 0;
          bValue = b.expected_close_date ? new Date(b.expected_close_date).getTime() : 0;
          break;
        case 'created':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [opportunities, sortField, sortDirection]);

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 shrink-0" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-1 h-3 w-3 shrink-0" /> : 
      <ArrowDown className="ml-1 h-3 w-3 shrink-0" />;
  };

  const ResizableHeader = ({ field, sortable = true, children }: { field: string; sortable?: boolean; children: React.ReactNode }) => (
    <TableHead style={{ width: columnWidths[field], minWidth: 80, maxWidth: columnWidths[field], position: 'relative' }} className="group">
      <div className="flex items-center justify-between pr-2">
        {sortable ? (
          <Button
            variant="ghost"
            onClick={() => handleSort(field)}
            className="h-auto p-0 hover:bg-transparent font-semibold text-xs truncate"
          >
            {children}
            {renderSortIcon(field)}
          </Button>
        ) : (
          <span className="font-semibold text-xs truncate">{children}</span>
        )}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-center justify-center z-10"
          onMouseDown={(e) => handleMouseDown(field, e)}
        >
          <div className="w-0.5 h-4 bg-border rounded-full" />
        </div>
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">No opportunities found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first opportunity to get started
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <div className="overflow-x-auto">
        <Table style={{ tableLayout: 'fixed', width: Object.values(columnWidths).reduce((a, b) => a + b, 0) }}>
          <TableHeader>
            <TableRow>
              <ResizableHeader field="name">Opportunity Name</ResizableHeader>
              <ResizableHeader field="company">Company</ResizableHeader>
              <ResizableHeader field="stage">Stage</ResizableHeader>
              <ResizableHeader field="products" sortable={false}>Products</ResizableHeader>
              <ResizableHeader field="amount">Amount</ResizableHeader>
              <ResizableHeader field="assigned" sortable={false}>Assigned To</ResizableHeader>
              <ResizableHeader field="close_date">Expected Close</ResizableHeader>
              <ResizableHeader field="notes" sortable={false}>Notes</ResizableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOpportunities.map((opportunity) => (
              <TableRow 
                key={opportunity.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectOpportunity?.(opportunity)}
              >
                <TableCell style={{ width: columnWidths.name, maxWidth: columnWidths.name }} className="font-medium">
                  <div className="truncate" title={opportunity.opportunity_name}>{opportunity.opportunity_name}</div>
                </TableCell>
                <TableCell style={{ width: columnWidths.company, maxWidth: columnWidths.company }}>
                  {opportunity.companies?.company_name ? (
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm truncate max-w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/companies', { state: { editCompanyId: opportunity.company_id } });
                      }}
                      title={opportunity.companies.company_name}
                    >
                      {opportunity.companies.company_name}
                    </Button>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
                <TableCell style={{ width: columnWidths.stage, maxWidth: columnWidths.stage }}>
                  <Badge 
                    className={statusColors[opportunity.stage] || "bg-muted"}
                  >
                    {opportunity.stage}
                  </Badge>
                </TableCell>
                <TableCell style={{ width: columnWidths.products, maxWidth: columnWidths.products }}>
                  {opportunity.opportunity_products?.length ? (
                    <div className="text-sm">
                      {opportunity.opportunity_products?.map((p, i) => (
                        <div key={i} className="truncate" title={`${p.quantity}x ${p.product_type}${p.model ? ` (${p.model})` : ''}`}>
                          {p.quantity}x {p.product_type}
                          {p.model && ` (${p.model})`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No products</span>
                  )}
                </TableCell>
                <TableCell style={{ width: columnWidths.amount, maxWidth: columnWidths.amount }}>
                  {opportunity.amount !== null && opportunity.amount !== undefined
                    ? `$${Number(opportunity.amount).toLocaleString()}`
                    : "—"}
                </TableCell>
                <TableCell style={{ width: columnWidths.assigned, maxWidth: columnWidths.assigned }}>
                  <div className="truncate" title={getAssigneeName(opportunity)}>{getAssigneeName(opportunity)}</div>
                </TableCell>
                <TableCell style={{ width: columnWidths.close_date, maxWidth: columnWidths.close_date }}>
                  {opportunity.expected_close_date
                    ? format(new Date(opportunity.expected_close_date), "MMM d, yyyy")
                    : "—"}
                </TableCell>
                <TableCell style={{ width: columnWidths.notes, maxWidth: columnWidths.notes }}>
                  {opportunity.notes ? (
                    <span className="text-sm text-muted-foreground truncate block" title={opportunity.notes}>
                      {opportunity.notes}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
