import { useState, useEffect } from "react";
import { useSessionTimeout } from '@/contexts/SessionTimeoutContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import * as XLSX from "@e965/xlsx";
import { Upload, Download, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { generateBatchId } from "@/lib/import/batchTracking";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: string[];
}

interface PotentialRelationship {
  rowIndex: number;
  newCompanyName: string;
  parentCompanyName: string;
  parentCompanyId: string;
  shouldBeSubsidiary: boolean | null;
}

export function ImportDialog({ open, onClose, onImportComplete }: ImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'relationships' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [potentialRelationships, setPotentialRelationships] = useState<PotentialRelationship[]>([]);
  const [currentRelationshipIndex, setCurrentRelationshipIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { pauseTimeout, resumeTimeout } = useSessionTimeout();

  useEffect(() => {
    if (step === 'importing') pauseTimeout();
    else resumeTimeout();
  }, [step]);

  const handleFileUpload = async (uploadedFile: File) => {
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (uploadedFile.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const validTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(uploadedFile.type) && !['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    
    try {
      if (fileExtension === 'csv') {
        Papa.parse(uploadedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setParsedData(results.data);
            setHeaders(results.meta.fields || []);
            setStep('map');
          },
          error: (error) => {
            toast({
              title: "Error parsing CSV",
              description: error.message,
              variant: "destructive",
            });
          }
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            if (jsonData.length > 0) {
              const headerRow = jsonData[0] as string[];
              const dataRows = jsonData.slice(1).map(row => {
                const obj: any = {};
                headerRow.forEach((header, index) => {
                  obj[header] = (row as any[])[index];
                });
                return obj;
              });
              
              setParsedData(dataRows);
              setHeaders(headerRow);
              setStep('map');
            }
          } catch (error: any) {
            toast({
              title: "Error parsing Excel",
              description: error.message,
              variant: "destructive",
            });
          }
        };
        reader.readAsArrayBuffer(uploadedFile);
      }
    } catch (error: any) {
      toast({
        title: "Error reading file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['company_name', 'website_url', 'industry_type', 'builder_segment', 'contractor_segment', 'industry_specialties', 'primary_phone', 'linkedin_company_url', 'status', 'priority_tier', 'lead_score', 'hvac_monitoring'],
      ['Example Builder Inc', 'https://example.com', 'Builder', 'production_tract', '', '', '555-1234', 'https://linkedin.com/company/example', 'Lead', 'P1', '85', 'Yes'],
      ['Sample HVAC Co', 'https://sample.com', 'Contractor', '', 'smart_home_champions', 'HVAC', '555-5678', 'https://linkedin.com/company/sample', 'Contacted', 'P2', '70', 'No'],
      ['Security Pro', 'https://securitypro.com', 'Contractor', '', '', 'CI/Security,Electrical', '555-9999', 'https://linkedin.com/company/securitypro', 'Lead', 'P1', '80', 'Not Interested']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');
    XLSX.writeFile(workbook, 'company_import_template.xlsx');
  };

  const detectPotentialRelationships = async () => {
    const relationships: PotentialRelationship[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const mappedData: any = {};
      
      Object.entries(columnMapping).forEach(([fileCol, crmField]) => {
        if (crmField && row[fileCol] !== undefined && row[fileCol] !== null && row[fileCol] !== '') {
          mappedData[crmField] = row[fileCol];
        }
      });

      if (!mappedData.company_name) continue;

      const companyName = String(mappedData.company_name).trim();
      
      // Check for patterns like "Parent: Division" or "Parent - Division"
      const separators = [':', '-', '|'];
      for (const separator of separators) {
        if (companyName.includes(separator)) {
          const parts = companyName.split(separator);
          const potentialParentName = parts[0].trim();
          
          // Search for similar parent company
          const { data: existingCompanies } = await supabase
            .from('companies')
            .select('id, company_name, company_type')
            .ilike('company_name', `%${potentialParentName}%`)
            .limit(5);

          if (existingCompanies && existingCompanies.length > 0) {
            // Find exact or close match
            const exactMatch = existingCompanies.find(c => 
              c.company_name.toLowerCase() === potentialParentName.toLowerCase()
            );
            
            if (exactMatch) {
              relationships.push({
                rowIndex: i,
                newCompanyName: companyName,
                parentCompanyName: exactMatch.company_name,
                parentCompanyId: exactMatch.id,
                shouldBeSubsidiary: null
              });
              break;
            }
          }
        }
      }
    }

    return relationships;
  };

  const handlePreviewToRelationships = async () => {
    setIsProcessing(true);
    try {
      const relationships = await detectPotentialRelationships();
      
      if (relationships.length > 0) {
        setPotentialRelationships(relationships);
        setCurrentRelationshipIndex(0);
        setStep('relationships');
      } else {
        handleImport();
      }
    } catch (error: any) {
      toast({
        title: "Error detecting relationships",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRelationshipDecision = (decision: boolean) => {
    const updated = [...potentialRelationships];
    updated[currentRelationshipIndex].shouldBeSubsidiary = decision;
    setPotentialRelationships(updated);

    if (currentRelationshipIndex < potentialRelationships.length - 1) {
      setCurrentRelationshipIndex(currentRelationshipIndex + 1);
    } else {
      handleImport();
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setImportProgress(0);
    
    const results: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: []
    };

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // First, fetch all existing company names to check for duplicates in one query
    const { data: existingCompanies } = await supabase
      .from('companies')
      .select('id, company_name');
    
    const existingNamesMap = new Map(
      (existingCompanies || []).map(c => [c.company_name.toLowerCase(), c.id])
    );

    // Process in smaller batches to avoid UI freezing
    const batchSize = 10;
    for (let batchStart = 0; batchStart < parsedData.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, parsedData.length);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const row = parsedData[i];
        
        try {
          // Map columns
          const mappedData: any = {};
          Object.entries(columnMapping).forEach(([fileCol, crmField]) => {
            if (crmField && row[fileCol] !== undefined && row[fileCol] !== null && row[fileCol] !== '') {
              // Handle industry_specialties as comma or semicolon-separated array with value mapping
              if (crmField === 'industry_specialties') {
                const value = String(row[fileCol]).trim();
                const valueMap: Record<string, string> = {
                  'HVAC_PROFESSIONAL': 'HVAC',
                  'Electrician': 'Electrical',
                  'Plumber': 'Plumbing',
                  'Builder Remodeler': 'General Contracting',
                  'Security Installer': 'Security & Automation',
                  'Smart Home': 'Smart Home Integration',
                  'Garage Door Dealer': 'Garage Door',
                  'Other': 'Other',
                  'Both Garage Door and/or Smart Home': 'General Contracting'
                };
                // Split on both commas and semicolons
                mappedData[crmField] = value.split(/[,;]/).map(s => {
                  const trimmed = s.trim();
                  return valueMap[trimmed] || trimmed;
                }).filter(s => s);
              } else {
                mappedData[crmField] = row[fileCol];
              }
            }
          });

          // Validate required fields
          if (!mappedData.company_name) {
            throw new Error('Company name is required');
          }
          if (!mappedData.industry_type) {
            // If industry_type is missing but we have company_type, use company_type as fallback
            if (mappedData.company_type) {
              mappedData.industry_type = mappedData.company_type;
            } else {
              throw new Error('Company type is required');
            }
          }

          // Add created_by if user is authenticated
          if (user) {
            mappedData.created_by = user.id;
          }

          // Check if this row has a confirmed parent-subsidiary relationship
          const relationship = potentialRelationships.find(r => r.rowIndex === i);
          if (relationship && relationship.shouldBeSubsidiary) {
            mappedData.company_type = 'subsidiary';
            mappedData.parent_company_id = relationship.parentCompanyId;
          }

          // Check for duplicates using the pre-loaded map
          const companyNameLower = mappedData.company_name.toLowerCase();
          if (existingNamesMap.has(companyNameLower)) {
            // Get the existing company ID
            const existingCompanyId = existingNamesMap.get(companyNameLower);
            
            // Fetch the existing company data
            const { data: existingCompany, error: fetchError } = await supabase
              .from('companies')
              .select('*')
              .eq('id', existingCompanyId)
              .single();

            if (fetchError || !existingCompany) {
              results.failed++;
              results.errors.push(`Row ${i + 2}: Failed to fetch existing company "${mappedData.company_name}"`);
              continue;
            }

            // Build update object with only missing fields
            const updateData: any = {};
            Object.keys(mappedData).forEach(key => {
              // Skip company_name, created_by, and system fields
              if (key === 'company_name' || key === 'created_by' || key === 'created_at' || key === 'updated_at') {
                return;
              }
              
              // Only update if the existing field is null, undefined, or empty
              const existingValue = existingCompany[key];
              if (existingValue === null || existingValue === undefined || existingValue === '' || 
                  (Array.isArray(existingValue) && existingValue.length === 0)) {
                updateData[key] = mappedData[key];
              }
            });

            // Only update if there are fields to update
            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from('companies')
                .update(updateData)
                .eq('id', existingCompanyId);

              if (updateError) {
                results.failed++;
                results.errors.push(`Row ${i + 2}: Failed to update "${mappedData.company_name}" - ${updateError.message}`);
              } else {
                results.duplicates++;
                results.errors.push(`Row ${i + 2}: Updated missing fields for "${mappedData.company_name}"`);
              }
            } else {
              results.duplicates++;
              results.errors.push(`Row ${i + 2}: Skipped "${mappedData.company_name}" - no missing fields to update`);
            }
            continue;
          }

          // Insert company
          const { data: newCompany, error } = await supabase
            .from('companies')
            .insert(mappedData)
            .select('id, company_name')
            .single();

          if (error) throw error;
          
          // Add to our local map to catch duplicates within this import
          if (newCompany) {
            existingNamesMap.set(companyNameLower, newCompany.id);
          }
          
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      // Update progress after each batch with a small delay to allow UI to update
      const progress = Math.round(((batchEnd) / parsedData.length) * 100);
      setImportProgress(progress);
      
      // Small delay to prevent UI freezing
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    setImportResults(results);
    setStep('complete');

    // Log the import activity with batch tracking
    if (user) {
      const batchId = generateBatchId();
      try {
        await supabase.from('import_export_logs').insert({
          user_id: user.id,
          batch_id: batchId,
          file_name: file?.name || null,
          activity_type: 'IMPORT',
          table_name: 'companies',
          affected_tables: ['companies'],
          record_count: parsedData.length,
          successful_count: results.success,
          failed_count: results.failed,
          duplicate_count: results.duplicates,
          file_format: file?.name.split('.').pop()?.toUpperCase(),
          rollback_available: true,
          error_summary: results.errors.length > 0 
            ? `${results.errors.length} errors occurred` 
            : null,
          detailed_errors: results.errors.length > 0 ? results.errors : null
        });
      } catch (error) {
        console.error('Failed to log import activity:', error);
      }
    }

    if (results.success > 0) {
      onImportComplete();
    }
  };

  const resetDialog = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setColumnMapping({});
    setImportProgress(0);
    setImportResults(null);
    setPotentialRelationships([]);
    setCurrentRelationshipIndex(0);
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Companies</DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload File */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Upload a CSV or Excel file containing company data
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) handleFileUpload(droppedFile);
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                Drag and drop your file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports CSV and Excel files (max 10MB)
              </p>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileUpload(selectedFile);
                }}
              />
            </div>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 'map' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Map File Columns to CRM Fields</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Match the columns from your file to the corresponding CRM fields. Required fields are marked with *.
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {headers.map(header => (
                <div key={header} className="flex items-center gap-4">
                  <Label className="w-1/3 font-medium text-sm">{header}</Label>
                  <div className="w-2/3">
                    <Select
                      value={columnMapping[header] || ''}
                      onValueChange={(value) => 
                        setColumnMapping({ ...columnMapping, [header]: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Skip this column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip this column</SelectItem>
                        <SelectItem value="company_name">Company Name *</SelectItem>
                        <SelectItem value="website_url">Website URL</SelectItem>
                        <SelectItem value="industry_type">Company Type (Builder/Contractor) *</SelectItem>
                        <SelectItem value="builder_segment">Builder Segment</SelectItem>
                        <SelectItem value="contractor_segment">Contractor Segment</SelectItem>
                        <SelectItem value="primary_phone">Phone</SelectItem>
                        <SelectItem value="address_line1">Street Address</SelectItem>
                        <SelectItem value="address_line2">Street Address 2</SelectItem>
                        <SelectItem value="city">City</SelectItem>
                        <SelectItem value="state">State/Region</SelectItem>
                        <SelectItem value="zip">Postal Code</SelectItem>
                        <SelectItem value="linkedin_company_url">LinkedIn URL</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="priority_tier">Priority Tier</SelectItem>
                        <SelectItem value="lead_score">Lead Score</SelectItem>
                        <SelectItem value="total_employees">Total Employees</SelectItem>
                        <SelectItem value="years_in_business">Years in Business</SelectItem>
                        <SelectItem value="annual_revenue_range">Annual Revenue Range</SelectItem>
                        <SelectItem value="nest_pro_partner_id">Nest Pro Partner ID</SelectItem>
                        <SelectItem value="hvac_monitoring">HVAC Monitoring</SelectItem>
                        <SelectItem value="franchise_name">Franchise Name</SelectItem>
                        <SelectItem value="owner_name">Owner</SelectItem>
                        <SelectItem value="industry_specialties">Industry Type (comma-separated)</SelectItem>
                        <SelectItem value="notes">Notes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={() => setStep('preview')}
                disabled={!Object.values(columnMapping).some(v => v === 'company_name') || 
                         !Object.values(columnMapping).some(v => v === 'industry_type')}
              >
                Preview Import
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview Data */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Preview Import Data</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Review the first 10 rows before importing. Total rows: {parsedData.length}
              </p>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {Object.entries(columnMapping).filter(([_, v]) => v && v !== 'skip').map(([fileCol, field]) => (
                      <th key={fileCol} className="px-4 py-2 text-left font-medium">
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-t">
                      {Object.entries(columnMapping).filter(([_, v]) => v && v !== 'skip').map(([fileCol, _]) => (
                        <td key={fileCol} className="px-4 py-2">
                          {row[fileCol]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('map')} disabled={isProcessing}>
                Back
              </Button>
              <Button onClick={handlePreviewToRelationships} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3.5: Confirm Parent-Subsidiary Relationships */}
        {step === 'relationships' && potentialRelationships.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Potential Parent-Subsidiary Relationship Detected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Question {currentRelationshipIndex + 1} of {potentialRelationships.length}
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3 mt-2">
                  <div>
                    <p className="font-medium mb-1">New Company:</p>
                    <p className="text-sm bg-muted px-3 py-2 rounded">
                      {potentialRelationships[currentRelationshipIndex].newCompanyName}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Existing Parent Company Found:</p>
                    <p className="text-sm bg-muted px-3 py-2 rounded">
                      {potentialRelationships[currentRelationshipIndex].parentCompanyName}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    Should "{potentialRelationships[currentRelationshipIndex].newCompanyName}" 
                    be created as a Subsidiary/Division of "{potentialRelationships[currentRelationshipIndex].parentCompanyName}"?
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => handleRelationshipDecision(false)}
              >
                No, Keep Standalone
              </Button>
              <Button 
                onClick={() => handleRelationshipDecision(true)}
              >
                Yes, Make it a Subsidiary
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing Progress */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Upload className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
              <h3 className="font-medium text-lg mb-2">Importing Companies...</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please wait while we process your file
              </p>
            </div>

            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(importProgress)}% complete
            </p>
          </div>
        )}

        {/* Step 5: Import Complete */}
        {step === 'complete' && importResults && (
          <div className="space-y-4">
            <div className="text-center py-4">
              {importResults.success > 0 ? (
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              ) : (
                <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              )}
              <h3 className="font-medium text-lg mb-2">Import Complete</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {importResults.success}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Successful</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {importResults.duplicates}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">Duplicates</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {importResults.failed}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">Failed</div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Errors:</h4>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {importResults.errors.slice(0, 20).map((error, index) => (
                    <div key={index} className="text-sm text-destructive mb-1">
                      {error}
                    </div>
                  ))}
                  {importResults.errors.length > 20 && (
                    <div className="text-sm text-muted-foreground mt-2">
                      ... and {importResults.errors.length - 20} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
