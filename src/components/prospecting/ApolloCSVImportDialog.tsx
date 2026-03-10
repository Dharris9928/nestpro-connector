import { useState } from 'react';
import { useSessionTimeout } from '@/contexts/SessionTimeoutContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Upload, CheckCircle, AlertCircle, FileUp } from 'lucide-react';
import {
  groupByCompany,
  importApolloData,
  type ImportResult,
  type CompanyWithContacts
} from '@/lib/prospecting/importApolloCSV';
import { supabase } from '@/integrations/supabase/client';
import { generateBatchId } from '@/lib/import/batchTracking';

interface ApolloCSVImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ApolloCSVImportDialog({
  open,
  onClose,
  onImportComplete
}: ApolloCSVImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [groupedData, setGroupedData] = useState<CompanyWithContacts[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (uploadedFile: File) => {
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (uploadedFile.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'csv') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file exported from Apollo.io',
        variant: 'destructive',
      });
      return;
    }

    setFile(uploadedFile);

    try {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          
          if (data.length === 0) {
            toast({
              title: 'Empty file',
              description: 'The CSV file does not contain any data rows',
              variant: 'destructive',
            });
            return;
          }

          // Get column headers from first row
          const columns = Object.keys(data[0] || {});
          console.log('CSV columns found:', columns);
          
          const grouped = groupByCompany(data);
          
          if (grouped.length === 0) {
            const columnList = columns.join(', ');
            toast({
              title: 'No company data found',
              description: `Could not find company names in CSV. Columns found: ${columnList}. Please ensure your CSV has a 'Company' or 'Organization Name' column.`,
              variant: 'destructive',
            });
            return;
          }

          setGroupedData(grouped);
          setStep('preview');
        },
        error: (error) => {
          toast({
            title: 'Error parsing CSV',
            description: error.message,
            variant: 'destructive',
          });
        }
      });
    } catch (error: any) {
      toast({
        title: 'Error reading file',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setImportProgress(0);

    try {
      const results = await importApolloData(groupedData, (current, total) => {
        setImportProgress(Math.round((current / total) * 100));
      });

      setImportResults(results);
      setStep('complete');

      // Log the import activity with batch tracking
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const batchId = generateBatchId();
        try {
          const totalRecords = groupedData.reduce((sum, g) => sum + g.contacts.length + 1, 0);
          await supabase.from('import_export_logs').insert({
            user_id: user.id,
            batch_id: batchId,
            file_name: file?.name || 'Apollo CSV',
            activity_type: 'IMPORT',
            table_name: 'companies',
            affected_tables: ['companies', 'contacts'],
            record_count: totalRecords,
            successful_count: results.companiesCreated + results.contactsCreated,
            failed_count: results.errors.length,
            duplicate_count: results.duplicatesSkipped,
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

      if (results.companiesCreated > 0 || results.contactsCreated > 0) {
        onImportComplete();
      }
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
      setStep('preview');
    }
  };

  const resetDialog = () => {
    setStep('upload');
    setFile(null);
    setGroupedData([]);
    setImportProgress(0);
    setImportResults(null);
  };

  const handleClose = () => {
    // Prevent closing during import or if user is in preview/importing step
    if (step === 'importing' || step === 'preview') {
      return;
    }
    resetDialog();
    onClose();
  };

  const totalContacts = groupedData.reduce((sum, g) => sum + g.contacts.length, 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Only allow closing if not in critical steps
      if (!isOpen && (step === 'importing' || step === 'preview')) {
        return;
      }
      if (!isOpen) {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => {
        // Prevent closing when clicking outside - users must use buttons
        e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>Import from Apollo.io</DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload File */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-accent/50 border border-border rounded-lg p-4">
              <h3 className="font-medium mb-2">How to export from Apollo.io:</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Search for companies in Apollo.io</li>
                <li>Select the companies you want to export</li>
                <li>Click "Export" and choose CSV format</li>
                <li>Upload the CSV file below</li>
              </ol>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) handleFileUpload(droppedFile);
              }}
              onClick={() => document.getElementById('apollo-file-input')?.click()}
            >
              <FileUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                Drag and drop Apollo CSV here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports CSV files (max 10MB)
              </p>
              <input
                id="apollo-file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileUpload(selectedFile);
                }}
              />
            </div>
          </div>
        )}

        {/* Step 2: Preview Data */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Preview Import</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ready to import <strong>{groupedData.length}</strong> companies with{' '}
                <strong>{totalContacts}</strong> contacts
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Company</th>
                      <th className="px-4 py-2 text-left font-medium">Industry</th>
                      <th className="px-4 py-2 text-left font-medium">Location</th>
                      <th className="px-4 py-2 text-left font-medium">Contacts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedData.slice(0, 50).map((group, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{group.companyData.company_name}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            group.companyData.industry_type === 'Builder'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-blue-500/10 text-blue-600'
                          }`}>
                            {group.companyData.industry_type}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {group.companyData.city && group.companyData.state
                            ? `${group.companyData.city}, ${group.companyData.state}`
                            : group.companyData.state || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-center">{group.contacts.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {groupedData.length > 50 && (
                <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground text-center">
                  Showing first 50 of {groupedData.length} companies
                </div>
              )}
            </div>

            <div className="bg-accent/50 border border-border rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">What will happen:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Companies will be automatically created in your CRM</li>
                <li>Contacts will be linked to their respective companies</li>
                <li>Duplicate companies and contacts will be skipped</li>
                <li>Lead scores will be automatically calculated</li>
              </ul>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {groupedData.length} Companies
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing Progress */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Upload className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
              <h3 className="font-medium text-lg mb-2">Importing from Apollo...</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Processing companies and contacts
              </p>
            </div>

            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(importProgress)}% complete
            </p>
          </div>
        )}

        {/* Step 4: Import Complete */}
        {step === 'complete' && importResults && (
          <div className="space-y-4">
            <div className="text-center py-4">
              {importResults.companiesCreated > 0 || importResults.contactsCreated > 0 ? (
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              ) : (
                <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              )}
              <h3 className="font-medium text-lg mb-2">Import Complete</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importResults.companiesCreated}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Companies Created
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {importResults.contactsCreated}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Contacts Created
                </div>
              </div>
            </div>

            {importResults.duplicatesSkipped > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  {importResults.duplicatesSkipped} Duplicates Skipped
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  These companies or contacts already exist in your CRM
                </div>
              </div>
            )}

            {importResults.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-sm">Errors ({importResults.errors.length}):</h4>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <ul className="text-xs space-y-1 text-destructive">
                    {importResults.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => window.location.href = '/companies'}>
                View Companies
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
