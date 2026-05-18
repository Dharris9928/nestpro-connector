import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

interface ImportJobQuotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ParsedRow = Record<string, string>;

const get = (row: ParsedRow, ...keys: string[]) => {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (h) => h.trim().toLowerCase() === k.trim().toLowerCase()
    );
    if (found && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return "";
};

const parseDate = (s: string): string | null => {
  if (!s) return null;
  const clean = s.split(" ")[0];
  const m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, mo, d, y] = m;
    const yr = y.length === 2 ? `20${y}` : y;
    return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(clean);
  return isNaN(dt.getTime()) ? null : dt.toISOString().split("T")[0];
};

const toInt = (s: string): number => {
  const n = parseInt((s || "").replace(/[^\d-]/g, ""), 10);
  return isNaN(n) ? 0 : n;
};

const parseCityStateZip = (s: string): { city: string | null; state: string | null; zip: string | null } => {
  if (!s) return { city: null, state: null, zip: null };
  // e.g. "NAMPA, ID" or "Jacksonville, FL 32256"
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { city: null, state: null, zip: null };
  const city = parts[0] || null;
  let state: string | null = null;
  let zip: string | null = null;
  if (parts.length >= 2) {
    const sz = parts[1].split(/\s+/).filter(Boolean);
    state = sz[0] || null;
    zip = sz[1] || null;
  }
  return { city, state, zip };
};

interface ProductLine {
  product_name: string;
  quantity: number;
}

interface RowResult {
  quote_number: string | null;
  date_received: string;
  product: string | null;
  quantity: number;
  notes: string | null;
  comments: string | null;
  status: string;
  wholesaler_name: string | null;
  wholesaler_city: string | null;
  wholesaler_state: string | null;
  wholesaler_zip: string | null;
  wholesaler_email: string | null;
  wholesaler_phone: string | null;
  products: ProductLine[];
}

function mapRow(row: ParsedRow): RowResult {
  const dateReceived =
    parseDate(get(row, "Date")) ||
    parseDate(get(row, "Created")) ||
    new Date().toISOString().split("T")[0];

  const p1Name = get(row, "Product #1", "Product 1", "Product");
  const p1Qty = toInt(get(row, "Quantity"));
  const p2Name = get(row, "Product #2", "Product 2");
  const p2Qty = toInt(get(row, "Quantity (Product #2)", "Quantity 2"));

  const products: ProductLine[] = [];
  if (p1Name) products.push({ product_name: p1Name, quantity: p1Qty > 0 ? p1Qty : 1 });
  if (p2Name) products.push({ product_name: p2Name, quantity: p2Qty > 0 ? p2Qty : 1 });

  const product = products.map((p) => p.product_name).join(", ") || null;
  const qty = products.reduce((s, p) => s + p.quantity, 0);

  const quoteNumber = get(row, "TSM Quote #", "TSM Quote#", "Quote #", "Quote Number") || null;
  const notes = get(row, "Notes") || null;

  const wholesalerName = get(row, "Name") || null;
  const { city, state, zip } = parseCityStateZip(get(row, "City, State, Zip"));

  const fields: Array<[string, string]> = [
    ["Submitter Contact", get(row, "Your First & Last Name")],
    ["Project", get(row, "Project Name")],
    ["Job Type", get(row, "Job Type")],
    ["Developer", get(row, "Developer")],
    ["Job Start", get(row, "Job Start Date")],
    ["Job End", get(row, "Job End Date")],
    ["Material Delivery", get(row, "Expected Material Delivery Date")],
    ["Nest Spec'd", get(row, "Is Google Nest Spec'd For This Project?")],
    ["TSM Rep", get(row, "My Google Nest Pro Rep")],
    ["TSM Account #", get(row, "Your TSM Account #")],
    ["Competing Product", get(row, "Competing Product")],
    ["Competing Price", get(row, "Competing Product Price Point")],
  ];
  const comments =
    fields
      .filter(([, v]) => v && !["n/a", "na"].includes(v.toLowerCase()))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n") || null;

  const rawStatus = (get(row, "Status") || "pending").toLowerCase();
  const status = rawStatus === "won" ? "won" : rawStatus === "lost" ? "lost" : "pending";

  return {
    quote_number: quoteNumber,
    date_received: dateReceived,
    product,
    quantity: qty > 0 ? qty : 1,
    notes,
    comments,
    status,
    wholesaler_name: wholesalerName,
    wholesaler_city: city,
    wholesaler_state: state,
    wholesaler_zip: zip,
    wholesaler_email: get(row, "Your Company Email Address") || null,
    wholesaler_phone: get(row, "Best Contact Phone Number") || null,
    products,
  };
}

export function ImportJobQuotesDialog({ open, onOpenChange }: ImportJobQuotesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{
    inserted: number;
    updated: number;
    companiesCreated: number;
    productsAdded: number;
    failed: number;
  } | null>(null);

  const reset = () => {
    setFile(null);
    setIsImporting(false);
    setProgress({ current: 0, total: 0 });
    setResult(null);
  };

  const handleClose = (next: boolean) => {
    if (isImporting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  // Find an existing wholesaler company (case-insensitive name match), or create one
  const resolveWholesaler = async (
    mapped: RowResult,
    userId: string,
    cache: Map<string, string>,
    counters: { companiesCreated: number }
  ): Promise<string | null> => {
    if (!mapped.wholesaler_name) return null;
    const key = mapped.wholesaler_name.trim().toLowerCase();
    if (cache.has(key)) return cache.get(key)!;

    // Match by name (case-insensitive) — any existing company can be used as a wholesaler
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .ilike("company_name", mapped.wholesaler_name.trim())
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      cache.set(key, existing.id);
      return existing.id;
    }

    // Wholesalers live under industry_type='Partner/Other' with 'Wholesaler' in industry_specialties
    const { data: created, error } = await supabase
      .from("companies")
      .insert({
        company_name: mapped.wholesaler_name.trim(),
        industry_type: "Partner/Other",
        industry_specialties: ["Wholesaler"],
        city: mapped.wholesaler_city,
        state: mapped.wholesaler_state,
        zip: mapped.wholesaler_zip,
        primary_email: mapped.wholesaler_email,
        primary_phone: mapped.wholesaler_phone,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !created) {
      console.error("Failed to create wholesaler:", error);
      return null;
    }
    counters.companiesCreated++;
    cache.set(key, created.id);
    return created.id;
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const text = await file.text();
      const parsed = Papa.parse<ParsedRow>(text, {
        header: true,
        skipEmptyLines: true,
      });

      const rows = parsed.data.filter((r) => Object.values(r).some((v) => v && String(v).trim()));
      setProgress({ current: 0, total: rows.length });

      // Fetch existing quote numbers to detect updates
      const { data: existing } = await supabase
        .from("job_quotes")
        .select("id, quote_number")
        .not("quote_number", "is", null);
      const existingMap = new Map<string, string>();
      (existing || []).forEach((q: any) => {
        if (q.quote_number) existingMap.set(q.quote_number.trim().toLowerCase(), q.id);
      });

      const companyCache = new Map<string, string>();
      const counters = { companiesCreated: 0 };
      let inserted = 0;
      let updated = 0;
      let productsAdded = 0;
      let failed = 0;

      // Look up "The Stockmarket" once — used when submitter email domain is @the-stockmarket.com
      let stockmarketId: string | null = null;
      {
        const { data: sm } = await supabase
          .from("companies")
          .select("id")
          .or("company_name.ilike.the stock market,company_name.ilike.the stockmarket,company_name.ilike.stockmarket")
          .limit(1)
          .maybeSingle();
        stockmarketId = sm?.id || null;
      }

      const insertProducts = async (quoteId: string, products: ProductLine[]) => {
        if (products.length === 0) return;
        // Clear existing products for this quote (in case of update)
        await supabase.from("job_quote_products").delete().eq("job_quote_id", quoteId);
        const { error } = await supabase.from("job_quote_products").insert(
          products.map((p) => ({
            job_quote_id: quoteId,
            product_name: p.product_name,
            quantity: p.quantity,
            unit_price: 0,
          }))
        );
        if (error) throw error;
        productsAdded += products.length;
      };

      for (let i = 0; i < rows.length; i++) {
        setProgress({ current: i + 1, total: rows.length });
        try {
          const mapped = mapRow(rows[i]);
          const wholesalerId = await resolveWholesaler(mapped, user.id, companyCache, counters);

          // Auto-assign distributor when submitter email is @the-stockmarket.com
          const emailDomain = (mapped.wholesaler_email || "").split("@")[1]?.toLowerCase().trim() || "";
          const distributorId = emailDomain === "the-stockmarket.com" ? stockmarketId : null;

          const payload = {
            date_received: mapped.date_received,
            product: mapped.product,
            quantity: mapped.quantity,
            notes: mapped.notes,
            comments: mapped.comments,
            status: mapped.status,
            wholesaler_id: wholesalerId,
            distributor_id: distributorId,
          };

          if (mapped.quote_number) {
            const existingId = existingMap.get(mapped.quote_number.trim().toLowerCase());
            if (existingId) {
              const { error } = await supabase
                .from("job_quotes")
                .update(payload)
                .eq("id", existingId);
              if (error) throw error;
              await insertProducts(existingId, mapped.products);
              updated++;
              continue;
            }
          }

          const { data: newQuote, error } = await supabase
            .from("job_quotes")
            .insert({
              ...payload,
              quote_number: mapped.quote_number,
              created_by: user.id,
            })
            .select("id")
            .single();
          if (error) throw error;
          if (newQuote?.id) await insertProducts(newQuote.id, mapped.products);
          inserted++;
        } catch (err: any) {
          console.error("Row import failed:", err, rows[i]);
          failed++;
        }
      }

      setResult({
        inserted,
        updated,
        companiesCreated: counters.companiesCreated,
        productsAdded,
        failed,
      });
      queryClient.invalidateQueries({ queryKey: ["job-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({
        title: "Import complete",
        description: `${inserted} added, ${updated} updated${failed ? `, ${failed} failed` : ""}.`,
      });
    } catch (e: any) {
      toast({
        title: "Import failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-xl"
        onInteractOutside={(e) => isImporting && e.preventDefault()}
        onEscapeKeyDown={(e) => isImporting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Import Job Quotes from CSV</DialogTitle>
          <DialogDescription>
            Rows are mapped into the proper form fields. Matching{" "}
            <strong>TSM Quote #</strong> updates existing quotes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV file</label>
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={isImporting}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
              }}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-xs space-y-1">
              <div className="font-medium">Column mapping:</div>
              <div>• <strong>Name</strong> → Wholesaler company (matched or created with City/State/Zip + email/phone)</div>
              <div>• <strong>Date</strong> → Date Received</div>
              <div>• <strong>TSM Quote #</strong> → Quote # (used for de-duplication)</div>
              <div>• <strong>Product #1/#2 + Quantity</strong> → Product line items</div>
              <div>• <strong>Status</strong> → Status (Open → Pending)</div>
              <div>• <strong>Notes</strong> → Notes</div>
              <div>• Project, Job Type, Developer, Dates, TSM Rep, Account #, Competing Product → Comments</div>
            </AlertDescription>
          </Alert>

          {isImporting && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing {progress.current} of {progress.total}…
            </div>
          )}

          {result && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div>✓ Quotes added: <strong>{result.inserted}</strong></div>
                  <div>↻ Quotes updated: <strong>{result.updated}</strong></div>
                  <div>🏢 Wholesaler companies created: <strong>{result.companiesCreated}</strong></div>
                  <div>📦 Product line items added: <strong>{result.productsAdded}</strong></div>
                  {result.failed > 0 && (
                    <div className="text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Failed: {result.failed} (see console)
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isImporting}
            >
              {result ? "Close" : "Cancel"}
            </Button>
            <Button onClick={handleImport} disabled={!file || isImporting}>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
