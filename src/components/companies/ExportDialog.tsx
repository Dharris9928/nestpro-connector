import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import * as XLSX from "@e965/xlsx";
import { Download, FileText, Table } from "lucide-react";
import { logContactExport } from "@/lib/contacts/logContactAccess";
import { useExportQuota } from "@/hooks/useExportQuota";
import { ExportApprovalRequestDialog } from "@/components/settings/ExportApprovalRequestDialog";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds?: string[] | null;
  filters: any;
  totalCount: number;
}

export function ExportDialog({ open, onClose, selectedIds, filters, totalCount }: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("xlsx");
  const [exportScope, setExportScope] = useState<"all" | "filtered" | "selected">(
    selectedIds && selectedIds.length > 0 ? "selected" : "filtered"
  );
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'company_name',
    'website_url',
    'industry_type',
    'builder_segment',
    'contractor_segment',
    'lead_score',
    'priority_tier',
    'status',
    'primary_phone',
    'total_employees',
    'annual_revenue_range'
  ]);
  const [includeRelated, setIncludeRelated] = useState({
    contacts: false,
    branches: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const { toast } = useToast();
  const { checkQuota, logExport } = useExportQuota();

  const buildSelectQuery = () => {
    let query = selectedFields.join(',');
    
    if (includeRelated.contacts) {
      query += ',contacts(first_name,last_name,title,email,phone)';
    }
    if (includeRelated.branches) {
      query += ',company_branches(branch_name,city,state,is_headquarters)';
    }

    return query;
  };

  const formatFieldName = (field: string) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportCount = getExportCount();
      
      // Check quota first
      const quotaCheck = await checkQuota(exportCount, 'companies');
      
      if (!quotaCheck.allowed) {
        toast({
          title: "Export Limit Exceeded",
          description: quotaCheck.reason,
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }
      
      if (quotaCheck.requires_approval) {
        setShowApprovalDialog(true);
        setIsExporting(false);
        return;
      }
      
      // Build query - use type assertion to avoid deep type instantiation
      let query: any = supabase.from("companies").select(`
        *,
        contacts(first_name, last_name, title, email, phone),
        company_branches(branch_name, city, state, is_headquarters)
      `);

      // Apply scope
      if (exportScope === "selected" && selectedIds && selectedIds.length > 0) {
        query = query.in("id", selectedIds);
      } else if (exportScope === "filtered") {
        // Apply filters
        if (filters.status) query = query.eq("status", filters.status);
        if (filters.priority) query = query.eq("priority_tier", filters.priority);
        if (filters.builderSegment) query = query.eq("builder_segment", filters.builderSegment);
        if (filters.contractorSegment) query = query.eq("contractor_segment", filters.contractorSegment);
        if (filters.industry) query = query.eq("industry_type", filters.industry);
        if (filters.state) query = query.eq("state", filters.state);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No companies to export",
          variant: "destructive",
        });
        return;
      }

      // Transform data for export
      const exportData = data.map((company: any) => {
        const row: any = {};
        
        selectedFields.forEach(field => {
          row[formatFieldName(field)] = company[field] ?? '';
        });

        // Add related data if requested
        if (includeRelated.contacts && Array.isArray(company.contacts)) {
          row['Contacts'] = company.contacts
            .map((c: any) => `${c.first_name} ${c.last_name} (${c.title || 'N/A'}) - ${c.email || c.phone || ''}`)
            .join('; ');
        }

        if (includeRelated.branches && Array.isArray(company.company_branches)) {
          row['Branches'] = company.company_branches
            .map((b: any) => `${b.branch_name || 'Branch'} - ${b.city}, ${b.state}${b.is_headquarters ? ' (HQ)' : ''}`)
            .join('; ');
        }

        return row;
      });

      // Generate file
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `companies_export_${timestamp}`;

      if (exportFormat === "csv") {
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      } else {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Companies");
        
        // Auto-size columns
        const maxWidth = 50;
        const colWidths = Object.keys(exportData[0] || {}).map(key => {
          const maxLength = Math.max(
            key.length,
            ...exportData.map(row => String(row[key] || '').length)
          );
          return { wch: Math.min(maxLength + 2, maxWidth) };
        });
        ws['!cols'] = colWidths;
        
        XLSX.writeFile(wb, `${filename}.xlsx`);
      }

      // Log contact export if contacts were included
      if (includeRelated.contacts) {
        const allContactIds = data
          .flatMap((company: any) => company.contacts || [])
          .map((contact: any) => contact.id)
          .filter(Boolean);
        
        if (allContactIds.length > 0) {
          logContactExport(allContactIds, exportFormat);
        }
      }

      // Log export activity with quota system
      await logExport(
        'companies',
        exportData.length,
        exportFormat.toUpperCase() as 'CSV' | 'EXCEL',
        exportScope === 'filtered' ? filters : null
      );
      
      // Also log in import_export_logs for backwards compatibility
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase.from('import_export_logs').insert({
            user_id: user.id,
            activity_type: 'export',
            table_name: 'companies',
            record_count: exportData.length,
            successful_count: exportData.length,
            failed_count: 0,
            duplicate_count: 0,
            file_format: exportFormat.toUpperCase(),
            filters_applied: exportScope === 'filtered' ? filters : null
          });
        } catch (error) {
          console.error('Failed to log export activity:', error);
        }
      }

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} companies`,
      });

      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export companies",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const getExportCount = () => {
    if (exportScope === "selected" && selectedIds) return selectedIds.length;
    if (exportScope === "filtered") return totalCount;
    return totalCount;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Companies</DialogTitle>
          </DialogHeader>

        <div className="space-y-6">
          {/* Export Scope */}
          <div>
            <h3 className="font-medium mb-3">What to Export</h3>
            <RadioGroup value={exportScope} onValueChange={(value: any) => setExportScope(value)}>
              {selectedIds && selectedIds.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="selected" />
                  <span>Selected companies ({selectedIds.length})</span>
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="filtered" />
                <span>All filtered companies ({totalCount})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="all" />
                <span>All companies in database</span>
              </label>
            </RadioGroup>
          </div>

          {/* Export Format */}
          <div>
            <h3 className="font-medium mb-3">Export Format</h3>
            <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="xlsx" />
                <Table className="h-4 w-4" />
                <span>Excel (.xlsx)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="csv" />
                <FileText className="h-4 w-4" />
                <span>CSV (.csv)</span>
              </label>
            </RadioGroup>
          </div>

          {/* Fields to Export */}
          <div>
            <h3 className="font-medium mb-3">Fields to Include</h3>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {AVAILABLE_FIELDS.map(field => (
                <label key={field.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedFields.includes(field.value)}
                    onCheckedChange={() => toggleField(field.value)}
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Related Data */}
          <div>
            <h3 className="font-medium mb-3">Include Related Data</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeRelated.contacts}
                  onCheckedChange={(checked) => 
                    setIncludeRelated({ ...includeRelated, contacts: checked as boolean })
                  }
                />
                <span className="text-sm">Contacts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeRelated.branches}
                  onCheckedChange={(checked) => 
                    setIncludeRelated({ ...includeRelated, branches: checked as boolean })
                  }
                />
                <span className="text-sm">Branches</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={selectedFields.length === 0 || isExporting}>
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : `Export ${getExportCount()} Companies`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <ExportApprovalRequestDialog
      open={showApprovalDialog}
      onOpenChange={setShowApprovalDialog}
      tableName="companies"
      recordCount={getExportCount()}
      exportType={exportFormat.toUpperCase()}
      filterCriteria={exportScope === 'filtered' ? filters : null}
      onApprovalRequested={() => {
        toast({
          title: "Approval Requested",
          description: "An admin will review your export request.",
        });
        onClose();
      }}
    />
    </>
  );
}

const AVAILABLE_FIELDS = [
  { value: 'company_name', label: 'Company Name' },
  { value: 'website_url', label: 'Website' },
  { value: 'industry_type', label: 'Industry' },
  { value: 'builder_segment', label: 'Builder Segment' },
  { value: 'contractor_segment', label: 'Contractor Segment' },
  { value: 'segment_confidence', label: 'Segment Confidence' },
  { value: 'lead_score', label: 'Lead Score' },
  { value: 'priority_tier', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'primary_phone', label: 'Phone' },
  { value: 'city', label: 'City' },
  { value: 'linkedin_company_url', label: 'LinkedIn' },
  { value: 'total_employees', label: 'Employees' },
  { value: 'annual_revenue_range', label: 'Revenue Range' },
  { value: 'years_in_business', label: 'Years in Business' },
  { value: 'nest_pro_partner_id', label: 'Nest Pro ID' },
  { value: 'is_franchise', label: 'Is Franchise' },
  { value: 'parent_company_id', label: 'Parent Company' },
  { value: 'franchise_name', label: 'Franchise Name' },
  { value: 'owner_name', label: 'Owner' },
  { value: 'nest_pro_industry', label: 'Nest Pro Industry' },
  { value: 'notes', label: 'Notes' },
  { value: 'created_at', label: 'Created Date' },
  { value: 'updated_at', label: 'Updated Date' }
];
