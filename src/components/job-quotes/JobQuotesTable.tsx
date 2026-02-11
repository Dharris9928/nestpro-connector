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

interface JobQuotesTableProps {
  quotes: any[];
  isLoading: boolean;
  onEdit: (quote: any) => void;
  onDelete: (id: string) => void;
  staleQuoteIds: string[];
}

export function JobQuotesTable({
  quotes,
  isLoading,
  onEdit,
  onDelete,
  staleQuoteIds,
}: JobQuotesTableProps) {
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date Received</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Total Price</TableHead>
            <TableHead>Distributor</TableHead>
            <TableHead>Wholesaler</TableHead>
            <TableHead>Comments</TableHead>
            <TableHead>Contacts</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date Won</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {staleQuoteIds.includes(quote.id) && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Pending for 3+ months
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {quote.date_received ? format(new Date(quote.date_received), "MMM d, yyyy") : "-"}
                </div>
              </TableCell>
              <TableCell className="font-medium max-w-[200px] truncate">
                {quote.product || "-"}
              </TableCell>
              <TableCell>{quote.quantity || "-"}</TableCell>
              <TableCell className="font-medium">{formatPrice(quote.price)}</TableCell>
              <TableCell>
                {quote.distributor?.company_name || "-"}
              </TableCell>
              <TableCell>
                {quote.wholesaler?.company_name || "-"}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {quote.comments || "-"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
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
              <TableCell>{getStatusBadge(quote.status)}</TableCell>
              <TableCell>
                {quote.date_won
                  ? format(new Date(quote.date_won), "MMM d, yyyy")
                  : "-"}
              </TableCell>
              <TableCell>
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
  );
}
