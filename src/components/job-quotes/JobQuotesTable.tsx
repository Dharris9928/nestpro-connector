import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { cn } from "@/lib/utils";

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
  po_number: 130,
  actions: 60,
};

type SortDir = "asc" | "desc" | null;
type Density = "compact" | "comfortable";

const DENSITY_KEY = "job-quotes-row-density";
const TIP_WIDTH = 340;

type TipRow = [string, string | number | null | undefined | false];
type TipData = { title?: string; rows?: TipRow[]; text?: string };
type HoverState = TipData & { x: number; yTop: number; yBottom: number };

const accessors: Record<string, (q: any) => any> = {
  date_received: (q) => (q.date_received ? new Date(q.date_received).getTime() : 0),
  product: (q) => q.product || "",
  quantity: (q) => q.quantity ?? 0,
  price: (q) => q.price ?? 0,
  distributor: (q) => q.distributor?.company_name || "",
  wholesaler: (q) => q.wholesaler?.company_name || "",
  assignee: (q) =>
    q.assignee_profile
      ? `${q.assignee_profile.first_name} ${q.assignee_profile.last_name}`
      : q.assignee_sales_rep
      ? `${q.assignee_sales_rep.first_name} ${q.assignee_sales_rep.last_name}`
      : "",
  comments: (q) => q.comments || "",
  notes: (q) => q.notes || "",
  contacts: (q) =>
    (q.job_quote_contacts || [])
      .map((c: any) => `${c.contact?.first_name || ""} ${c.contact?.last_name || ""}`)
      .join(", "),
  status: (q) => q.status || "",
  date_won: (q) => (q.date_won ? new Date(q.date_won).getTime() : 0),
  po_number: (q) => q.po_number || "",
};

const formatSubmissionDate = (value: string) => {
  const date = new Date(value);
  return format(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12),
    "MMM d, yyyy"
  );
};

const money = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "-"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const fmtDate = (value: string | null | undefined) =>
  value ? format(new Date(value), "MMM d, yyyy") : "-";

const contactTypeLabel = (type: string) => {
  switch (type) {
    case "wholesale_personnel":
      return "Wholesale";
    case "nest_field_team":
      return "Nest field team";
    case "distributor_personnel":
      return "Distributor";
    default:
      return "Customer";
  }
};

/**
 * Descriptive facts for a quote, used by the shared hover card so a truncated
 * cell can still surface everything known about that field.
 */
function quoteTips(quote: any, stale: boolean) {
  const price = parseFloat(quote.price);
  const hasPrice = Number.isFinite(price);
  const qty = Number(quote.quantity) || 0;
  const unit = hasPrice && qty > 0 ? price / qty : null;
  const purchase = Number.parseFloat(quote.purchase_price);
  const hasPurchase = Number.isFinite(purchase);
  const margin = hasPrice && hasPurchase && price > 0 ? ((price - purchase) / price) * 100 : null;
  const received = quote.date_received ? new Date(quote.date_received) : null;
  const won = quote.date_won ? new Date(quote.date_won) : null;
  const isPending = quote.status === "pending";
  const daysPending =
    received && isPending ? Math.max(0, Math.round((Date.now() - received.getTime()) / 86400000)) : null;
  const cycle = received && won ? Math.round((won.getTime() - received.getTime()) / 86400000) : null;
  const products: any[] = quote.job_quote_products || [];
  const contacts: any[] = quote.job_quote_contacts || [];
  const rep = quote.assignee_sales_rep;
  const profile = quote.assignee_profile;
  const assigneeName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : rep
    ? rep.is_firm
      ? rep.first_name
      : `${rep.first_name || ""} ${rep.last_name || ""}`.trim()
    : "";

  const companyRows = (c: any): TipRow[] =>
    c
      ? [
          ["Company", c.company_name],
          ["CRM status", c.status],
          ["Segment", c.segment],
          ["Location", [c.city, c.state].filter(Boolean).join(", ")],
        ]
      : [];

  return {
    date: {
      title: quote.quote_number ? `Quote #${quote.quote_number}` : "Quote",
      rows: [
        ["Date received", quote.date_received ? formatSubmissionDate(quote.date_received) : "-"],
        ["Added to CRM", fmtDate(quote.created_at)],
        ["Last changed", fmtDate(quote.updated_at)],
        daysPending !== null ? ["Days pending", `${daysPending} days`] : null,
        cycle !== null ? ["Days to decision", `${cycle} days`] : null,
        stale ? ["Flagged", "Pending 3+ months"] : null,
      ].filter(Boolean) as TipRow[],
    } as TipData,
    product: {
      title: quote.product || "Product",
      rows: [
        ["Line items", products.length ? `${products.length}` : "1 (quote header only)"],
        ...products.map((p: any, i: number) => [
          `Line ${i + 1}`,
          `${p.product_name} · ${p.quantity} × ${money(p.unit_price)} = ${money(p.total_price)}`,
        ]),
      ].filter(Boolean) as TipRow[],
    } as TipData,
    quantity: {
      title: `Quantity: ${qty || "-"}`,
      rows: [
        ["Units", qty || "-"],
        ["Unit price (from total)", money(unit)],
        ["Quote total", hasPrice ? money(price) : "-"],
        ["Line items", products.length || "-"],
      ] as TipRow[],
    } as TipData,
    price: {
      title: `Total: ${hasPrice ? money(price) : "-"}`,
      rows: [
        ["Units", qty || "-"],
        ["Unit price (from total)", money(unit)],
        ["Purchase price", hasPurchase ? money(purchase) : "not recorded"],
        ["Margin", margin !== null ? `${margin.toFixed(1)}%` : "-"],
        ["PO number", quote.po_number || "none"],
      ] as TipRow[],
    } as TipData,
    distributor: {
      title: quote.distributor?.company_name || "No distributor linked",
      rows: companyRows(quote.distributor),
    } as TipData,
    wholesaler: {
      title: quote.wholesaler?.company_name || "No wholesaler linked",
      rows: companyRows(quote.wholesaler),
    } as TipData,
    assignee: {
      title: assigneeName || "Unassigned",
      rows: (profile
        ? [
            ["Type", "Team member"],
            ["Role", profile.role],
          ]
        : rep
        ? [
            ["Type", rep.is_firm ? "Rep firm" : "Sales rep"],
            ["Email", rep.email],
            ["Territory", rep.territory],
            ["States covered", rep.covered_states],
            ["Active", rep.active === false ? "No" : "Yes"],
          ]
        : [["Note", "No assignee set — edit the quote to assign one"]]
      ) as TipRow[],
    } as TipData,
    contacts: {
      title: contacts.length ? `${contacts.length} contact${contacts.length > 1 ? "s" : ""}` : "No contacts linked",
      rows: contacts.map((c: any) => {
        const name = `${c.contact?.first_name || ""} ${c.contact?.last_name || ""}`.trim() || "Unknown";
        const title = c.contact?.title ? ` — ${c.contact.title}` : "";
        return [contactTypeLabel(c.contact_type), `${name}${title}`] as TipRow;
      }),
    } as TipData,
    status: {
      title: `${quote.status ? quote.status[0].toUpperCase() + quote.status.slice(1) : "Pending"}`,
      rows: [
        ["Status", quote.status],
        daysPending !== null ? ["Days pending", `${daysPending} days`] : null,
        cycle !== null ? ["Days to decision", `${cycle} days`] : null,
        ["Won on", won ? fmtDate(quote.date_won) : "-"],
        ["PO on file", quote.po_file_url ? "Yes" : "No"],
      ].filter(Boolean) as TipRow[],
    } as TipData,
    date_won: {
      title: won ? `Won ${fmtDate(quote.date_won)}` : "Not yet won",
      rows: [
        ["Date won", won ? fmtDate(quote.date_won) : "-"],
        ["Date received", received ? formatSubmissionDate(quote.date_received) : "-"],
        cycle !== null ? ["Days to decision", `${cycle} days`] : null,
      ].filter(Boolean) as TipRow[],
    } as TipData,
    po_number: {
      title: quote.po_number ? `PO ${quote.po_number}` : "No PO number",
      rows: [
        ["PO number", quote.po_number || "-"],
        ["Quote number", quote.quote_number || "-"],
        ["PO file", quote.po_file_url ? "Uploaded" : "Not uploaded"],
        ["Total", hasPrice ? money(price) : "-"],
      ] as TipRow[],
    } as TipData,
    comments: { text: quote.comments || "", title: "Comments" } as TipData,
    notes: { text: quote.notes || "", title: "Notes" } as TipData,
  };
}

export function JobQuotesTable({
  quotes,
  isLoading,
  onEdit,
  onDelete,
  staleQuoteIds,
}: JobQuotesTableProps) {
  const { columnWidths, handleMouseDown, totalWidth } = useResizableColumns(DEFAULT_WIDTHS);
  const [sortField, setSortField] = useState<string | null>("date_received");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [density, setDensity] = useState<Density>(() =>
    typeof window !== "undefined" && window.localStorage.getItem(DENSITY_KEY) === "comfortable"
      ? "comfortable"
      : "compact"
  );
  const [hover, setHover] = useState<HoverState | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const [boxHeight, setBoxHeight] = useState<number>(480);

  const compact = density === "compact";

  const changeDensity = (next: Density) => {
    setDensity(next);
    try {
      window.localStorage.setItem(DENSITY_KEY, next);
    } catch {
      // storage unavailable (private mode) — density just won't persist
    }
  };

  // Keep the table area pinned to the remaining window height so the column
  // headers and assignee tabs stay on screen while the rows scroll.
  useEffect(() => {
    const measure = () => {
      const el = boxRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setBoxHeight(Math.max(320, Math.round(window.innerHeight - top - 16)));
    };
    measure();
    const timer = window.setTimeout(measure, 250);
    window.addEventListener("resize", measure);
    // Re-measure when the panels above collapse/expand (page height changes).
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  const tip = (get: () => TipData) => ({
    onMouseEnter: (e: React.MouseEvent) => {
      const data = get();
      const hasRows = (data.rows || []).length > 0;
      if (!data.text && !hasRows) return;
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHover({ ...data, x: r.left, yTop: r.top, yBottom: r.bottom });
    },
    onMouseLeave: () => setHover(null),
  });

  const toggleSort = (field: string) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortField(null);
      setSortDir(null);
    } else {
      setSortDir("asc");
    }
  };

  const processed = useMemo(() => {
    let rows = [...quotes];

    for (const [field, value] of Object.entries(filters)) {
      if (!value) continue;
      const accessor = accessors[field];
      if (!accessor) continue;
      const needle = value.toLowerCase();
      rows = rows.filter((r) => String(accessor(r) ?? "").toLowerCase().includes(needle));
    }

    if (sortField && sortDir) {
      const accessor = accessors[sortField];
      rows.sort((a, b) => {
        const av = accessor(a);
        const bv = accessor(b);
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [quotes, sortField, sortDir, filters]);

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

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const ResizableHeader = ({
    field,
    children,
    sortable = true,
    filterable = true,
  }: {
    field: string;
    children?: React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
  }) => {
    const activeFilter = filters[field];
    return (
      <TableHead
        style={{ width: columnWidths[field], minWidth: 60, maxWidth: columnWidths[field] }}
        className={cn(
          "group select-none sticky top-0 z-20 bg-card border-b",
          compact && "h-9 px-3 text-xs"
        )}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!sortable}
            onClick={() => sortable && toggleSort(field)}
            className="flex items-center gap-1 truncate text-left hover:text-foreground transition-colors disabled:cursor-default"
          >
            <span className="truncate">{children}</span>
            {sortable && <SortIcon field={field} />}
          </button>

          {filterable && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex">
              <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-5 w-5 shrink-0 ${activeFilter ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-60 hover:opacity-100"}`}
                >
                  <Filter className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 z-50" align="start">
                <div className="flex items-center gap-1">
                  <Input
                    autoFocus
                    placeholder={`Filter ${typeof children === "string" ? children : "value"}...`}
                    value={activeFilter || ""}
                    onChange={(e) => setFilters((f) => ({ ...f, [field]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                  {activeFilter && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setFilters((f) => {
                        const n = { ...f };
                        delete n[field];
                        return n;
                      })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </PopoverContent>
              </Popover>
            </div>
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

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const cellBase = compact ? "px-3 py-1 text-xs" : "";
  const textCell = compact ? "truncate" : "line-clamp-3 break-words text-sm text-left cursor-help";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {processed.length} of {quotes.length} quotes
          </span>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setFilters({})}
            >
              <X className="h-3 w-3 mr-1" />
              Clear all filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-md border bg-card p-0.5">
          {(["compact", "comfortable"] as Density[]).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={density === option ? "secondary" : "ghost"}
              className="h-6 px-2 text-xs"
              onClick={() => changeDensity(option)}
            >
              {option === "compact" ? "Compact" : "Comfortable"}
            </Button>
          ))}
        </div>
      </div>

      <div
        ref={boxRef}
        className="rounded-md border bg-card overflow-hidden [&>div]:h-full"
        style={{ height: boxHeight }}
      >
        <Table style={{ tableLayout: "fixed", width: totalWidth }}>
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
              <ResizableHeader field="po_number">PO Number</ResizableHeader>
              <ResizableHeader field="actions" sortable={false} filterable={false}></ResizableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processed.map((quote) => {
              const stale = staleQuoteIds.includes(quote.id);
              const tips = quoteTips(quote, stale);
              const contacts: any[] = quote.job_quote_contacts || [];
              const maxContactBadges = compact ? 1 : 2;
              return (
                <TableRow
                  key={quote.id}
                  onClick={() => onEdit(quote)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell
                    style={{ width: columnWidths.date_received, maxWidth: columnWidths.date_received }}
                    className={cellBase}
                    {...tip(() => tips.date)}
                  >
                    <div className="flex items-center gap-2">
                      {stale && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
                      <span className="truncate">{quote.date_received ? formatSubmissionDate(quote.date_received) : "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.product, maxWidth: columnWidths.product }}
                    className={cn("font-medium", cellBase)}
                    {...tip(() => tips.product)}
                  >
                    <div className="truncate">{quote.product || "-"}</div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.quantity, maxWidth: columnWidths.quantity }}
                    className={cellBase}
                    {...tip(() => tips.quantity)}
                  >
                    <div className="truncate">{quote.quantity || "-"}</div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.price, maxWidth: columnWidths.price }}
                    className={cn("font-medium", cellBase)}
                    {...tip(() => tips.price)}
                  >
                    <div className="truncate">{formatPrice(quote.price)}</div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.distributor, maxWidth: columnWidths.distributor }}
                    className={cellBase}
                    {...tip(() => tips.distributor)}
                  >
                    <div className="truncate">{quote.distributor?.company_name || "-"}</div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.wholesaler, maxWidth: columnWidths.wholesaler }}
                    className={cellBase}
                    {...tip(() => tips.wholesaler)}
                  >
                    <div className="truncate">{quote.wholesaler?.company_name || "-"}</div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.assignee, maxWidth: columnWidths.assignee }}
                    className={cellBase}
                    {...tip(() => tips.assignee)}
                  >
                    <div className="truncate">
                      {quote.assignee_profile
                        ? `${quote.assignee_profile.first_name} ${quote.assignee_profile.last_name}`
                        : quote.assignee_sales_rep
                        ? quote.assignee_sales_rep.is_firm
                          ? quote.assignee_sales_rep.first_name
                          : `${quote.assignee_sales_rep.first_name} ${quote.assignee_sales_rep.last_name}`
                        : "-"}
                    </div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.comments, maxWidth: columnWidths.comments }}
                    className={cn("align-top", cellBase)}
                    {...tip(() => tips.comments)}
                  >
                    {quote.comments ? (
                      <div className={textCell}>{quote.comments}</div>
                    ) : (
                      <span className="text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.notes, maxWidth: columnWidths.notes }}
                    className={cn("align-top", cellBase)}
                    {...tip(() => tips.notes)}
                  >
                    {quote.notes ? (
                      <div className={textCell}>{quote.notes}</div>
                    ) : (
                      <span className="text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.contacts, maxWidth: columnWidths.contacts }}
                    className={cellBase}
                    {...tip(() => tips.contacts)}
                  >
                    <div className={compact ? "flex flex-nowrap gap-1 overflow-hidden" : "flex flex-wrap gap-1"}>
                      {contacts.slice(0, maxContactBadges).map((jqc: any) => (
                        <Badge key={jqc.id} variant="outline" className="text-xs whitespace-nowrap">
                          {jqc.contact?.first_name} {jqc.contact?.last_name?.[0]}.
                        </Badge>
                      ))}
                      {contacts.length > maxContactBadges && (
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          +{contacts.length - maxContactBadges}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.status, maxWidth: columnWidths.status }}
                    className={cellBase}
                    {...tip(() => tips.status)}
                  >
                    {getStatusBadge(quote.status)}
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.date_won, maxWidth: columnWidths.date_won }}
                    className={cellBase}
                    {...tip(() => tips.date_won)}
                  >
                    <div className="truncate">
                      {quote.date_won ? format(new Date(quote.date_won), "MMM d, yyyy") : "-"}
                    </div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.po_number, maxWidth: columnWidths.po_number }}
                    className={cn("font-medium", cellBase)}
                    {...tip(() => tips.po_number)}
                  >
                    <div className="truncate">{quote.po_number || "-"}</div>
                  </TableCell>
                  <TableCell
                    style={{ width: columnWidths.actions, maxWidth: columnWidths.actions }}
                    onClick={(e) => e.stopPropagation()}
                    className={cellBase}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
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
              );
            })}
          </TableBody>
        </Table>
      </div>

      {hover && (
        <div
          className="fixed z-[80] pointer-events-none rounded-md border bg-popover text-popover-foreground shadow-lg p-2.5 text-xs max-w-[340px]"
          style={{
            width: TIP_WIDTH,
            maxWidth: TIP_WIDTH,
            left: Math.min(Math.max(8, hover.x), Math.max(8, window.innerWidth - TIP_WIDTH - 8)),
            top:
              hover.yBottom + 220 < window.innerHeight
                ? hover.yBottom + 6
                : undefined,
            bottom:
              hover.yBottom + 220 < window.innerHeight
                ? undefined
                : Math.max(8, window.innerHeight - hover.yTop + 6),
          }}
        >
          {hover.title && <p className="font-semibold mb-1 whitespace-pre-wrap">{hover.title}</p>}
          {hover.text && (
            <p className="whitespace-pre-wrap break-words text-popover-foreground/90">{hover.text}</p>
          )}
          {(hover.rows || []).length > 0 && (
            <div className="space-y-0.5">
              {(hover.rows || []).map(([label, value], i) => (
                <div key={`${label}-${i}`} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="break-words">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
