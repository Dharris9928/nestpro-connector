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
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  companies?: { company_name: string } | null;
  profiles?: { first_name: string; last_name: string } | null;
  opportunity_products?: any[];
}

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  isLoading: boolean;
  onSelectOpportunity?: (opportunity: Opportunity) => void;
}

const statusColors: Record<string, string> = {
  prospecting: "bg-blue-500",
  qualification: "bg-yellow-500",
  proposal: "bg-purple-500",
  negotiation: "bg-orange-500",
  closed_won: "bg-green-500",
  closed_lost: "bg-red-500",
};

export function OpportunitiesTable({ opportunities, isLoading, onSelectOpportunity }: OpportunitiesTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Get assigned_to IDs that don't have profiles (likely sales_reps)
  const unassignedIds = useMemo(() => {
    return opportunities
      .filter(o => o.assigned_to && !o.profiles)
      .map(o => o.assigned_to as string);
  }, [opportunities]);

  // Fetch sales_reps for those without profiles
  const { data: salesRepsMap } = useQuery({
    queryKey: ['sales-reps-for-opportunities', unassignedIds],
    queryFn: async () => {
      if (unassignedIds.length === 0) return {};
      const { data, error } = await supabase
        .from('sales_reps' as any)
        .select('id, first_name, last_name')
        .in('id', unassignedIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as any[])?.forEach(rep => {
        map[rep.id] = `${rep.first_name} ${rep.last_name}`;
      });
      return map;
    },
    enabled: unassignedIds.length > 0,
  });

  const getAssigneeName = (opportunity: Opportunity) => {
    if (opportunity.profiles) {
      return `${opportunity.profiles.first_name} ${opportunity.profiles.last_name}`;
    }
    if (opportunity.assigned_to && salesRepsMap?.[opportunity.assigned_to]) {
      return salesRepsMap[opportunity.assigned_to];
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
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="name">Opportunity Name</SortableHeader>
            <SortableHeader field="company">Company</SortableHeader>
            <SortableHeader field="stage">Stage</SortableHeader>
            <TableHead>Products</TableHead>
            <SortableHeader field="amount">Amount</SortableHeader>
            <TableHead>Assigned To</TableHead>
            <SortableHeader field="close_date">Expected Close</SortableHeader>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOpportunities.map((opportunity) => (
            <TableRow 
              key={opportunity.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectOpportunity?.(opportunity)}
            >
              <TableCell className="font-medium">
                {opportunity.opportunity_name}
              </TableCell>
              <TableCell>
                {opportunity.companies?.company_name ? (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/companies', { state: { editCompanyId: opportunity.company_id } });
                    }}
                  >
                    {opportunity.companies.company_name}
                  </Button>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>
                <Badge className={statusColors[opportunity.stage] || "bg-muted"}>
                  {opportunity.stage}
                </Badge>
              </TableCell>
              <TableCell>
                {opportunity.opportunity_products?.length ? (
                  <div className="text-sm">
                    {opportunity.opportunity_products?.map((p, i) => (
                      <div key={i}>
                        {p.quantity}x {p.product_type}
                        {p.model && ` (${p.model})`}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No products</span>
                )}
              </TableCell>
              <TableCell>
                {opportunity.amount !== null && opportunity.amount !== undefined
                  ? `$${Number(opportunity.amount).toLocaleString()}`
                  : "—"}
              </TableCell>
              <TableCell>
                {getAssigneeName(opportunity)}
              </TableCell>
              <TableCell>
                {opportunity.expected_close_date
                  ? format(new Date(opportunity.expected_close_date), "MMM d, yyyy")
                  : "—"}
              </TableCell>
              <TableCell className="max-w-xs">
                {opportunity.notes ? (
                  <span className="text-sm text-muted-foreground truncate block">
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
  );
}
