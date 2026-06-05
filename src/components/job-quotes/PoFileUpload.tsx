import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, X, Download, Sparkles } from "lucide-react";

interface PoExtracted {
  po_number?: string | null;
  po_date?: string | null;
  total_amount?: number | null;
  vendor_name?: string | null;
  customer_name?: string | null;
  ship_to?: string | null;
  notes?: string | null;
}

interface PoFileUploadProps {
  value?: string | null;
  onChange: (path: string | null) => void;
  quoteId?: string;
  onExtracted?: (data: PoExtracted) => void;
}

const BUCKET = "job-quote-pos";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export function PoFileUpload({ value, onChange, quoteId, onExtracted }: PoFileUploadProps) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<PoExtracted>({});
  const [verifyOpen, setVerifyOpen] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 20MB", variant: "destructive" });
      return;
    }

    setPendingFile(file);
    setScanning(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-po-info", {
        body: { fileBase64, mimeType: file.type, fileName: file.name },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setExtracted((data as any)?.extracted || {});
    } catch (err: any) {
      console.error(err);
      toast({
        title: "AI scan failed",
        description: err.message || "You can still upload manually.",
        variant: "destructive",
      });
      setExtracted({});
    } finally {
      setScanning(false);
      setVerifyOpen(true);
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop();
      let folder = quoteId;
      if (!folder) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) throw new Error("You must be signed in to upload");
        folder = `unassigned/${userData.user.id}`;
      }
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, pendingFile, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      onChange(path);
      onExtracted?.(extracted);
      toast({ title: "PO uploaded", description: "Extracted fields applied to the quote." });
      setVerifyOpen(false);
      setPendingFile(null);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setVerifyOpen(false);
    setPendingFile(null);
    setExtracted({});
  };

  const handleDownload = async () => {
    if (!value) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(value, 60);
    if (error) {
      toast({ title: "Could not open file", description: error.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleRemove = async () => {
    if (value) await supabase.storage.from(BUCKET).remove([value]);
    onChange(null);
  };

  const fileName = value?.split("/").pop() || "PO file";

  const updateField = (key: keyof PoExtracted, val: string) => {
    setExtracted((prev) => ({
      ...prev,
      [key]: key === "total_amount" ? (val === "" ? null : Number(val)) : val,
    }));
  };

  return (
    <>
      <div className="space-y-2">
        {value ? (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1 truncate">{fileName}</span>
            <Button type="button" variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelected}
              disabled={scanning || uploading}
              className="cursor-pointer"
            />
            {scanning && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Scanning...
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={verifyOpen} onOpenChange={(o) => !o && handleCancelUpload()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Verify PO details
            </DialogTitle>
            <DialogDescription>
              Review the AI-extracted fields below and edit if needed. The file will be uploaded after you confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>PO Number</Label>
                <Input
                  value={extracted.po_number ?? ""}
                  onChange={(e) => updateField("po_number", e.target.value)}
                />
              </div>
              <div>
                <Label>PO Date</Label>
                <Input
                  type="date"
                  value={extracted.po_date ?? ""}
                  onChange={(e) => updateField("po_date", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={extracted.total_amount ?? ""}
                  onChange={(e) => updateField("total_amount", e.target.value)}
                />
              </div>
              <div>
                <Label>Vendor</Label>
                <Input
                  value={extracted.vendor_name ?? ""}
                  onChange={(e) => updateField("vendor_name", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Customer</Label>
              <Input
                value={extracted.customer_name ?? ""}
                onChange={(e) => updateField("customer_name", e.target.value)}
              />
            </div>

            <div>
              <Label>Ship To</Label>
              <Input
                value={extracted.ship_to ?? ""}
                onChange={(e) => updateField("ship_to", e.target.value)}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={extracted.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelUpload} disabled={uploading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmUpload} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
