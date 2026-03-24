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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useResizableColumns } from "@/hooks/useResizableColumns";

interface JobQuotesTableProps {
  quotes: any[];
  isLoading: boolean;
  onEdit: (quote: any) => void;
  onDelete: (id: string) => void;
  staleQuoteIds: string[];
}

const DEFAULT_WIDTHS: Record<string, number> = {
  date_received: 130,
  product: 180,
  quantity: 70,
  price: 120,
  distributor: 140,
  wholesaler: 140,
  assignee: 140,
  comments: 150,
  notes: 150,
  contacts: 160,
  status: 100,
  date_won: 120,
  actions: 60,
};

export function JobQuotesTable({
  quotes,
  isLoading,
  onEdit,
  onDelete,
  staleQuoteIds,
}: JobQuotesTableProps) {
  const { columnWidths, handleMouseDown, totalWidth } = useResizableColumns(DEFAULT_WIDTHS);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-success text-success-foreground">Won</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getContactTypeBadge = (type: string) => {
    switch (type) {
      case "wholesale_personnel":
        return <Badge variant="outline" className="text-xs">Wholesale</Badge>;
      case "nest_field_team":
        return <Badge variant="outline" className="text-xs bg-primary/10">Nest Team</Badge>;
      case "distributor_personnel":
        return <Badge variant="outline" className="text-xs bg-accent">Distributor</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Customer</Badge>;
    }
  };

  const ResizableHeader = ({ field, children }: { field: string; children?: React.ReactNode }) => (
    <TableHead style={{ width: columnWidths[field], minWidth: 60, maxWidth: columnWidths[field], position: 'relative' }} className="group">
      <div className="flex items-center justify-between pr-2">
        <span className="truncate">{children}</span>
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
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No job quotes found. Click "Add Quote" to create one.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <Table style={{ tableLayout: 'fixed', width: totalWidth }}>
          <TableHeader>
            <TableRow>
              <ResizableHeader field="date_received">Date Received</ResizableHeader>
              <ResizableHeader field="product">Product</ResizableHeader>
              <ResizableHeader field="quantity">Qty</ResizableHeader>
              <ResizableHeader field="price">Total Price</ResizableHeader>
              <ResizableHeader field="distributor">Distributor</ResizableHeader>
              <ResizableHeader field="wholesaler">Wholesaler</ResizableHeader>
              <ResizableHeader field="assignee">Assignee</ResizableHeader>
              <ResizableHeader field="comments">Comments</ResizableHeader>
              <ResizableHeader field="notes">Notes</ResizableHeader>
              <ResizableHeader field="contacts">Contacts</ResizableHeader>
              <ResizableHeader field="status">Status</ResizableHeader>
              <ResizableHeader field="date_won">Date Won</ResizableHeader>
              <ResizableHeader field="actions"></ResizableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell style={{ width: columnWidths.date_received, maxWidth: columnWidths.date_received }}>
                  <div className="flex items-center gap-2">
                    {staleQuoteIds.includes(quote.id) && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Pending for 3+ months
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <span className="truncate">{quote.date_received ? format(new Date(quote.date_received), "MMM d, yyyy") : "-"}</span>
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.product, maxWidth: columnWidths.product }} className="font-medium">
                  <div className="truncate" title={quote.product || ''}>{quote.product || "-"}</div>
                </TableCell>
                <TableCell style={{ width: columnWidths.quantity, maxWidth: columnWidths.quantity }}>{quote.quantity || "-"}</TableCell>
                <TableCell style={{ width: columnWidths.price, maxWidth: columnWidths.price }} className="font-medium">
                  <div className="truncate">{formatPrice(quote.price)}</div>
                </TableCell>
                <TableCell style={{ width: columnWidths.distributor, maxWidth: columnWidths.distributor }}>
                  <div className="truncate" title={quote.distributor?.company_name || ''}>{quote.distributor?.company_name || "-"}</div>
                </TableCell>
                <TableCell style={{ width: columnWidths.wholesaler, maxWidth: columnWidths.wholesaler }}>
                  <div className="truncate" title={quote.wholesaler?.company_name || ''}>{quote.wholesaler?.company_name || "-"}</div>
                </TableCell>
                <TableCell style={{ width: columnWidths.assignee, maxWidth: columnWidths.assignee }}>
                  <div className="truncate">
                    {quote.assignee_profile
                      ? `${quote.assignee_profile.first_name} ${quote.assignee_profile.last_name}`
                      : quote.assignee_sales_rep
                      ? `${quote.assignee_sales_rep.first_name} ${quote.assignee_sales_rep.last_name}`
                      : "-"}
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.comments, maxWidth: columnWidths.comments }}>
                  <div className="whitespace-pre-wrap break-words text-sm">{quote.comments || "-"}</div>
                </TableCell>
                <TableCell style={{ width: columnWidths.notes, maxWidth: columnWidths.notes }}>
                  <div className="truncate" title={quote.notes || ''}>{quote.notes || "-"}</div>
                </TableCell>
                <TableCell style={{ width: columnWidths.contacts, maxWidth: columnWidths.contacts }}>
                  <div className="flex flex-wrap gap-1">
                    {quote.job_quote_contacts?.slice(0, 2).map((jqc: any) => (
                      <Tooltip key={jqc.id}>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs">
                            {jqc.contact?.first_name} {jqc.contact?.last_name?.[0]}.
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p>{jqc.contact?.first_name} {jqc.contact?.last_name}</p>
                            {getContactTypeBadge(jqc.contact_type)}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {quote.job_quote_contacts?.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{quote.job_quote_contacts.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.status, maxWidth: columnWidths.status }}>{getStatusBadge(quote.status)}</TableCell>
                <TableCell style={{ width: columnWidths.date_won, maxWidth: columnWidths.date_won }}>
                  <div className="truncate">
                    {quote.date_won
                      ? format(new Date(quote.date_won), "MMM d, yyyy")
                      : "-"}
                  </div>
                </TableCell>
                <TableCell style={{ width: columnWidths.actions, maxWidth: columnWidths.actions }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(quote)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(quote.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
