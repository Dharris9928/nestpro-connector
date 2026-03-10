import { useState, useEffect } from 'react';
import { useSessionTimeout } from '@/contexts/SessionTimeoutContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Upload, Download, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Papa from 'papaparse';
import { Progress } from '@/components/ui/progress';
import { generateBatchId } from '@/lib/import/batchTracking';

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  companiesCreated: number;
  companiesMatched: number;
  errors: string[];
}

export function ImportContactsDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const { pauseTimeout, resumeTimeout } = useSessionTimeout();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

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

  const findOrCreateCompany = async (row: any): Promise<string | null> => {
    if (!row.company_name?.trim()) return null;

    // Try to find existing company by name
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .ilike('company_name', row.company_name.trim())
      .limit(1)
      .maybeSingle();

    if (existingCompany) {
      return existingCompany.id;
    }

    // Create new company
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
      console.error('Error creating company:', error);
      return null;
    }

    return newCompany.id;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    const importResult: ImportResult = {
      total: 0,
      successful: 0,
      failed: 0,
      companiesCreated: 0,
      companiesMatched: 0,
      errors: [],
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
              // Find or create company
              let companyId: string | null = null;
              let companyCreated = false;

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
                  companyId = await findOrCreateCompany(row);
                  if (companyId) {
                    companyCreated = true;
                    importResult.companiesCreated++;
                  }
                }
              }

              if (!companyId) {
                importResult.errors.push(`Row ${i + 1}: Company name required or company creation failed`);
                importResult.failed++;
                continue;
              }

              // Check if contact already exists
              const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('email', row.email?.trim() || '')
                .eq('company_id', companyId)
                .maybeSingle();

              if (existingContact) {
                importResult.errors.push(`Row ${i + 1}: Contact already exists - ${row.email}`);
                importResult.failed++;
                continue;
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
                throw contactError;
              }

              importResult.successful++;
            } catch (error: any) {
              console.error(`Error processing row ${i + 1}:`, error);
              importResult.errors.push(`Row ${i + 1}: ${error.message}`);
              importResult.failed++;
            }
          }

          // Log import activity with batch tracking
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

    // Reset file input
    event.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import contacts. Companies will be automatically created if they don't exist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> The CSV must include company_name and at least first_name, last_name, and email for each contact.
              If a company doesn't exist, it will be created automatically.
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
                Upload your completed CSV file to import contacts
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
                />
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

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <Label className="text-destructive">Errors:</Label>
                  <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground mt-2 space-y-1">
                    {result.errors.slice(0, 10).map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                    {result.errors.length > 10 && (
                      <div className="text-muted-foreground">
                        ... and {result.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
