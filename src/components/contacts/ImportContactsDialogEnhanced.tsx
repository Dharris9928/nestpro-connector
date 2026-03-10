import { useState, useCallback, useEffect } from 'react';
import { useSessionTimeout } from '@/contexts/SessionTimeoutContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Upload, Download, Loader2, CheckCircle2, XCircle, AlertCircle, FileText, ChevronDown, ChevronRight, Search, UserCheck, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Papa from 'papaparse';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { generateBatchId } from '@/lib/import/batchTracking';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface UnmatchedRow {
  rowIndex: number;
  csvData: Record<string, string>;
  reason: string;
  reasonCode: 'no_company' | 'company_create_failed' | 'duplicate_contact' | 'missing_name' | 'insert_error' | 'missing_email';
  possibleCompanyMatches?: { id: string; company_name: string; similarity: string }[];
  possibleContactMatches?: { id: string; first_name: string; last_name: string; email: string; company_name: string }[];
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  companiesCreated: number;
  companiesMatched: number;
  errors: string[];
  unmatchedRows: UnmatchedRow[];
}

export function ImportContactsDialogEnhanced({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const { pauseTimeout, resumeTimeout } = useSessionTimeout();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (importing) pauseTimeout();
    else resumeTimeout();
  }, [importing]);

  const handleDownloadTemplate = () => {
    const template = `first_name,last_name,title,email,phone,mobile,linkedin_url,company_name,industry_type,city,state,website_url,annual_revenue_range
John,Smith,CEO,john@company.com,555-1234,555-5678,https://linkedin.com/in/johnsmith,ABC Builders,Builder,Austin,TX,https://abcbuilders.com,$10M-$50M
Jane,Doe,VP Operations,jane@contractor.com,555-8765,555-4321,https://linkedin.com/in/janedoe,XYZ Contractors,Contractor,Dallas,TX,https://xyzcontractors.com,$5M-$10M`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'CSV template downloaded successfully',
    });
  };

  const findPossibleCompanyMatches = async (companyName: string): Promise<{ id: string; company_name: string; similarity: string }[]> => {
    if (!companyName?.trim()) return [];
    const name = companyName.trim();

    // Search for similar company names using partial matching
    const words = name.split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return [];

    // Try the longest word first for best match
    const searchWord = words.sort((a, b) => b.length - a.length)[0];
    const { data } = await supabase
      .from('companies')
      .select('id, company_name')
      .ilike('company_name', `%${searchWord}%`)
      .limit(5);

    if (!data || data.length === 0) return [];

    return data.map(c => {
      const nameLower = name.toLowerCase();
      const matchLower = c.company_name.toLowerCase();
      let similarity = 'Low';
      if (matchLower.includes(nameLower) || nameLower.includes(matchLower)) {
        similarity = 'High';
      } else if (words.filter(w => matchLower.includes(w.toLowerCase())).length > 1) {
        similarity = 'Medium';
      }
      return { id: c.id, company_name: c.company_name, similarity };
    });
  };

  const findPossibleContactMatches = async (email: string, firstName: string, lastName: string): Promise<{ id: string; first_name: string; last_name: string; email: string; company_name: string }[]> => {
    const matches: any[] = [];

    // Search by email domain
    if (email?.trim()) {
      const domain = email.split('@')[1];
      if (domain) {
        const { data: emailMatches } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, companies(company_name)')
          .ilike('email', `%@${domain}`)
          .limit(5);
        if (emailMatches) {
          matches.push(...emailMatches.map(c => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email || '',
            company_name: (c.companies as any)?.company_name || 'Unknown',
          })));
        }
      }
    }

    // Search by name if we don't have enough matches
    if (matches.length < 3 && (firstName?.trim() || lastName?.trim())) {
      let nameQuery = supabase.from('contacts').select('id, first_name, last_name, email, companies(company_name)');
      if (lastName?.trim()) {
        nameQuery = nameQuery.ilike('last_name', `%${lastName.trim()}%`);
      }
      if (firstName?.trim()) {
        nameQuery = nameQuery.ilike('first_name', `%${firstName.trim()}%`);
      }
      const { data: nameMatches } = await nameQuery.limit(5);
      if (nameMatches) {
        const existingIds = new Set(matches.map(m => m.id));
        nameMatches.forEach(c => {
          if (!existingIds.has(c.id)) {
            matches.push({
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email || '',
              company_name: (c.companies as any)?.company_name || 'Unknown',
            });
          }
        });
      }
    }

    return matches.slice(0, 5);
  };

  const processFile = async (file: File) => {
    setImporting(true);
    setProgress(0);
    setResult(null);
    setShowReport(false);

    const importResult: ImportResult = {
      total: 0,
      successful: 0,
      failed: 0,
      companiesCreated: 0,
      companiesMatched: 0,
      errors: [],
      unmatchedRows: [],
    };

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as any[];
          importResult.total = rows.length;

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            setProgress(((i + 1) / rows.length) * 100);

            try {
              // Check required name fields
              if (!row.first_name?.trim() && !row.last_name?.trim()) {
                const possibleContactMatches = await findPossibleContactMatches(row.email, row.first_name, row.last_name);
                importResult.unmatchedRows.push({
                  rowIndex: i + 1,
                  csvData: row,
                  reason: 'Missing first_name and last_name — cannot create contact without a name.',
                  reasonCode: 'missing_name',
                  possibleContactMatches: possibleContactMatches.length > 0 ? possibleContactMatches : undefined,
                });
                importResult.errors.push(`Row ${i + 1}: Missing first_name and last_name`);
                importResult.failed++;
                continue;
              }

              // Check for email
              if (!row.email?.trim()) {
                importResult.unmatchedRows.push({
                  rowIndex: i + 1,
                  csvData: row,
                  reason: 'No email provided — contact created but matching/dedup not possible without email.',
                  reasonCode: 'missing_email',
                });
              }

              let companyId: string | null = null;

              if (row.company_name?.trim()) {
                const { data: existingCompany } = await supabase
                  .from('companies')
                  .select('id')
                  .ilike('company_name', row.company_name.trim())
                  .limit(1)
                  .maybeSingle();

                if (existingCompany) {
                  companyId = existingCompany.id;
                  importResult.companiesMatched++;
                } else {
                  // Try to create, but also find possible matches
                  const possibleCompanyMatches = await findPossibleCompanyMatches(row.company_name);

                  const companyData: any = {
                    company_name: row.company_name.trim(),
                    industry_type: row.industry_type || 'Contractor',
                    status: 'Lead',
                  };
                  if (row.city) companyData.city = row.city;
                  if (row.state) companyData.state = row.state;
                  if (row.website_url) companyData.website_url = row.website_url;
                  if (row.annual_revenue_range) companyData.annual_revenue_range = row.annual_revenue_range;

                  const { data: newCompany, error } = await supabase
                    .from('companies')
                    .insert(companyData)
                    .select('id')
                    .single();

                  if (error) {
                    importResult.unmatchedRows.push({
                      rowIndex: i + 1,
                      csvData: row,
                      reason: `Company "${row.company_name}" could not be created: ${error.message}`,
                      reasonCode: 'company_create_failed',
                      possibleCompanyMatches: possibleCompanyMatches.length > 0 ? possibleCompanyMatches : undefined,
                    });
                    importResult.errors.push(`Row ${i + 1}: Company creation failed - ${error.message}`);
                    importResult.failed++;
                    continue;
                  }

                  companyId = newCompany.id;
                  importResult.companiesCreated++;

                  // Note if there were similar companies (possible duplicates)
                  if (possibleCompanyMatches.length > 0) {
                    importResult.unmatchedRows.push({
                      rowIndex: i + 1,
                      csvData: row,
                      reason: `New company "${row.company_name}" was created, but similar companies already exist — may be a duplicate.`,
                      reasonCode: 'company_create_failed', // reuse for display grouping
                      possibleCompanyMatches,
                    });
                  }
                }
              } else {
                // No company name at all
                const possibleContactMatches = await findPossibleContactMatches(row.email, row.first_name, row.last_name);
                importResult.unmatchedRows.push({
                  rowIndex: i + 1,
                  csvData: row,
                  reason: 'No company_name provided — cannot assign contact to a company.',
                  reasonCode: 'no_company',
                  possibleContactMatches: possibleContactMatches.length > 0 ? possibleContactMatches : undefined,
                });
                importResult.errors.push(`Row ${i + 1}: Company name required`);
                importResult.failed++;
                continue;
              }

              // Check if contact already exists (duplicate)
              if (row.email?.trim()) {
                const { data: existingContact } = await supabase
                  .from('contacts')
                  .select('id, first_name, last_name, companies(company_name)')
                  .eq('email', row.email.trim())
                  .maybeSingle();

                if (existingContact) {
                  importResult.unmatchedRows.push({
                    rowIndex: i + 1,
                    csvData: row,
                    reason: `Email "${row.email}" already exists in the system under "${(existingContact.companies as any)?.company_name || 'Unknown'}" as ${existingContact.first_name} ${existingContact.last_name}.`,
                    reasonCode: 'duplicate_contact',
                    possibleContactMatches: [{
                      id: existingContact.id,
                      first_name: existingContact.first_name,
                      last_name: existingContact.last_name,
                      email: row.email.trim(),
                      company_name: (existingContact.companies as any)?.company_name || 'Unknown',
                    }],
                  });
                  importResult.errors.push(`Row ${i + 1}: Duplicate contact - ${row.email}`);
                  importResult.failed++;
                  continue;
                }
              }

              // Create contact
              const contactData: any = {
                company_id: companyId,
                first_name: row.first_name?.trim() || '',
                last_name: row.last_name?.trim() || '',
              };

              if (row.title) contactData.title = row.title.trim();
              if (row.email) contactData.email = row.email.trim();
              if (row.phone) contactData.phone = row.phone.trim();
              if (row.mobile) contactData.mobile = row.mobile.trim();
              if (row.linkedin_url) contactData.linkedin_url = row.linkedin_url.trim();

              const { error: contactError } = await supabase
                .from('contacts')
                .insert(contactData);

              if (contactError) {
                const possibleContactMatches = await findPossibleContactMatches(row.email, row.first_name, row.last_name);
                importResult.unmatchedRows.push({
                  rowIndex: i + 1,
                  csvData: row,
                  reason: `Insert failed: ${contactError.message}`,
                  reasonCode: 'insert_error',
                  possibleContactMatches: possibleContactMatches.length > 0 ? possibleContactMatches : undefined,
                });
                throw contactError;
              }

              importResult.successful++;
            } catch (error: any) {
              console.error(`Error processing row ${i + 1}:`, error);
              importResult.errors.push(`Row ${i + 1}: ${error.message}`);
              importResult.failed++;
            }
          }

          const batchId = generateBatchId();
          await supabase.from('import_export_logs').insert({
            user_id: user.id,
            batch_id: batchId,
            file_name: file.name,
            activity_type: 'IMPORT',
            table_name: 'contacts',
            affected_tables: ['contacts', 'companies'],
            record_count: importResult.total,
            successful_count: importResult.successful,
            failed_count: importResult.failed,
            file_format: 'CSV',
            rollback_available: true,
            detailed_errors: importResult.errors.length > 0 ? importResult.errors : null,
          });

          setResult(importResult);
          setImporting(false);
          setSelectedFile(null);
          if (importResult.unmatchedRows.length > 0) {
            setShowReport(true);
          }

          if (importResult.successful > 0) {
            toast({
              title: 'Import Complete',
              description: `Successfully imported ${importResult.successful} contacts and created ${importResult.companiesCreated} companies`,
            });
            onSuccess?.();
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast({
            title: 'Error',
            description: 'Failed to parse CSV file',
            variant: 'destructive',
          });
          setImporting(false);
        },
      });
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to import contacts',
        variant: 'destructive',
      });
      setImporting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    event.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleStartImport = () => {
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDownloadReport = () => {
    if (!result?.unmatchedRows.length) return;

    const reportRows = result.unmatchedRows.map(row => ({
      'Row #': row.rowIndex,
      'First Name': row.csvData.first_name || '',
      'Last Name': row.csvData.last_name || '',
      'Email': row.csvData.email || '',
      'Company': row.csvData.company_name || '',
      'Failure Reason': row.reason,
      'Possible Company Matches': row.possibleCompanyMatches?.map(m => `${m.company_name} (${m.similarity})`).join('; ') || '',
      'Possible Contact Matches': row.possibleContactMatches?.map(m => `${m.first_name} ${m.last_name} <${m.email}> @ ${m.company_name}`).join('; ') || '',
    }));

    const csv = Papa.unparse(reportRows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_match_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const groupedUnmatched = result?.unmatchedRows.reduce((acc, row) => {
    const key = row.reasonCode;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {} as Record<string, UnmatchedRow[]>) || {};

  const reasonLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    duplicate_contact: { label: 'Duplicate Contacts', icon: <UserCheck className="h-4 w-4" />, color: 'text-amber-500' },
    no_company: { label: 'Missing Company Name', icon: <Building2 className="h-4 w-4" />, color: 'text-red-500' },
    company_create_failed: { label: 'Company Issues / Possible Duplicates', icon: <Building2 className="h-4 w-4" />, color: 'text-orange-500' },
    missing_name: { label: 'Missing Contact Name', icon: <XCircle className="h-4 w-4" />, color: 'text-red-500' },
    missing_email: { label: 'Missing Email (Warning)', icon: <AlertCircle className="h-4 w-4" />, color: 'text-yellow-500' },
    insert_error: { label: 'Database Insert Errors', icon: <XCircle className="h-4 w-4" />, color: 'text-destructive' },
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShowReport(false); } }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import contacts. Drag and drop or click to browse.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {!showReport ? (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> CSV must include company_name and at least first_name, last_name, and email.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <Label>Step 1: Download Template</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Download the CSV template to see the required format
                    </p>
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div>
                    <Label>Step 2: Upload Your CSV</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop your CSV file or click to browse
                    </p>
                    
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                        selectedFile ? "bg-muted/50" : ""
                      )}
                    >
                      {selectedFile ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center gap-3">
                            <FileText className="h-8 w-8 text-primary" />
                            <div className="text-left">
                              <p className="font-medium">{selectedFile.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(selectedFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-center">
                            <Button onClick={handleStartImport} disabled={importing}>
                              {importing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Start Import
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedFile(null)}
                              disabled={importing}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-lg font-medium mb-2">Drop your CSV file here</p>
                          <p className="text-sm text-muted-foreground mb-4">or</p>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleFileUpload}
                              disabled={importing}
                              className="hidden"
                            />
                            <Button variant="outline" asChild disabled={importing}>
                              <span>Browse Files</span>
                            </Button>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {importing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Importing contacts...</span>
                    </div>
                    <Progress value={progress} />
                    <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-3 p-4 border rounded-lg">
                    <h4 className="font-semibold">Import Results</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Successful: {result.successful}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>Failed: {result.failed}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        <span>Companies Created: {result.companiesCreated}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                        <span>Companies Matched: {result.companiesMatched}</span>
                      </div>
                    </div>

                    {result.unmatchedRows.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowReport(true)}
                          className="w-full"
                        >
                          <Search className="h-4 w-4 mr-2" />
                          View Match Report ({result.unmatchedRows.length} issues)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Match Failure Report */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Import Match Report</h3>
                    <p className="text-sm text-muted-foreground">
                      {result?.unmatchedRows.length} rows had issues — review reasons and possible matches below.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowReport(false)}>
                      Back to Results
                    </Button>
                  </div>
                </div>

                {/* Summary badges */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(groupedUnmatched).map(([code, rows]) => {
                    const meta = reasonLabels[code] || { label: code, icon: null, color: 'text-muted-foreground' };
                    return (
                      <Badge key={code} variant="outline" className="gap-1.5 py-1">
                        <span className={meta.color}>{meta.icon}</span>
                        {meta.label}: {rows.length}
                      </Badge>
                    );
                  })}
                </div>

                {/* Grouped accordion */}
                <Accordion type="multiple" className="w-full">
                  {Object.entries(groupedUnmatched).map(([code, rows]) => {
                    const meta = reasonLabels[code] || { label: code, icon: null, color: 'text-muted-foreground' };
                    return (
                      <AccordionItem key={code} value={code}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span className={meta.color}>{meta.icon}</span>
                            <span>{meta.label}</span>
                            <Badge variant="secondary" className="ml-2">{rows.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {rows.map((row, idx) => (
                              <div key={idx} className="p-3 bg-muted/50 rounded-lg border text-sm space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className="font-medium">Row {row.rowIndex}:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {row.csvData.first_name} {row.csvData.last_name}
                                      {row.csvData.email && ` <${row.csvData.email}>`}
                                      {row.csvData.company_name && ` — ${row.csvData.company_name}`}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-muted-foreground text-xs">{row.reason}</p>

                                {row.possibleCompanyMatches && row.possibleCompanyMatches.length > 0 && (
                                  <div className="mt-2 p-2 bg-background rounded border">
                                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      Possible Company Matches:
                                    </p>
                                    <div className="space-y-1">
                                      {row.possibleCompanyMatches.map((match, mIdx) => (
                                        <div key={mIdx} className="text-xs flex items-center gap-2">
                                          <span>{match.company_name}</span>
                                          <Badge variant={match.similarity === 'High' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                            {match.similarity}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {row.possibleContactMatches && row.possibleContactMatches.length > 0 && (
                                  <div className="mt-2 p-2 bg-background rounded border">
                                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                                      <UserCheck className="h-3 w-3" />
                                      Possible Contact Matches:
                                    </p>
                                    <div className="space-y-1">
                                      {row.possibleContactMatches.map((match, mIdx) => (
                                        <div key={mIdx} className="text-xs text-muted-foreground">
                                          {match.first_name} {match.last_name} &lt;{match.email}&gt; — {match.company_name}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
                Close
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
