import { useState, useEffect } from 'react';
import { useSessionTimeout } from '@/contexts/SessionTimeoutContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Papa from 'papaparse';
import { Progress } from '@/components/ui/progress';
import { createContact } from '@/lib/contacts/createContact';
import { generateBatchId } from '@/lib/import/batchTracking';

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  companiesCreated: number;
  companiesMatched: number;
  errors: string[];
}

interface ApolloContactRow {
  'First Name': string;
  'Last Name': string;
  'Title': string;
  'Email': string;
  'Company Name': string;
  'Work Direct Phone': string;
  'Mobile Phone': string;
  'Corporate Phone': string;
  'Person Linkedin Url': string;
  'Website': string;
  'Company City': string;
  'Company State': string;
  'Industry': string;
  '# Employees': string;
  'Company Linkedin Url': string;
  'Company Phone': string;
  'Seniority': string;
}

export function ApolloContactImportDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const { pauseTimeout, resumeTimeout } = useSessionTimeout();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (importing) pauseTimeout();
    else resumeTimeout();
  }, [importing]);

  const cleanPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Remove quotes, +1, spaces, and non-digits, then format
    const cleaned = phone.replace(/['"]/g, '').replace(/^\+1\s*/, '').replace(/[^\d]/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    return cleaned;
  };

  const normalizeStateName = (state: string | null): string | null => {
    if (!state) return null;
    
    const trimmed = state.trim();
    
    // If already 2-letter code, return uppercase
    if (/^[A-Z]{2}$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    
    // State name mapping
    const stateMap: Record<string, string> = {
      'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
      'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
      'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
      'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
      'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
      'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
      'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
      'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
      'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
      'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
      'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
      'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
      'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
    };
    
    const normalized = trimmed.toLowerCase();
    return stateMap[normalized] || null;
  };

  const detectIndustryType = (industry: string, companyName: string): 'Builder' | 'Contractor' => {
    const industryLower = (industry || '').toLowerCase();
    const nameLower = (companyName || '').toLowerCase();
    
    const builderKeywords = ['builder', 'construction', 'development', 'homes', 'residential'];
    const contractorKeywords = ['hvac', 'plumbing', 'electrical', 'mechanical', 'contractor', 'services'];
    
    const combinedText = `${industryLower} ${nameLower}`;
    
    if (builderKeywords.some(keyword => combinedText.includes(keyword))) {
      return 'Builder';
    }
    if (contractorKeywords.some(keyword => combinedText.includes(keyword))) {
      return 'Contractor';
    }
    
    return 'Contractor'; // Default
  };

  const findOrCreateCompany = async (row: ApolloContactRow, userId: string): Promise<{ id: string; created: boolean } | null> => {
    const companyName = row['Company Name']?.trim();
    if (!companyName) return null;

    // Try to find existing company by name
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .ilike('company_name', companyName)
      .limit(1)
      .maybeSingle();

    if (existingCompany) {
      return { id: existingCompany.id, created: false };
    }

    // Create new company with Apollo data
    const industryType = detectIndustryType(row['Industry'], companyName);
    
    const companyData: any = {
      company_name: companyName,
      industry_type: industryType,
      status: 'Lead',
      city: row['Company City']?.trim() || null,
      state: normalizeStateName(row['Company State']),
      website_url: row['Website']?.trim() || null,
      linkedin_company_url: row['Company Linkedin Url']?.trim() || null,
      primary_phone: cleanPhoneNumber(row['Company Phone']) || null,
      address_line1: row['Company Address']?.trim() || null,
      created_by: userId,
    };

    // Parse employees - handle both numeric and string formats
    const employees = row['# Employees']?.toString().trim();
    if (employees) {
      const employeeNum = parseInt(employees.replace(/,/g, ''), 10);
      if (!isNaN(employeeNum) && employeeNum > 0) {
        companyData.total_employees = employeeNum;
      }
    }

    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert(companyData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating company:', error);
      return null;
    }

    return { id: newCompany.id, created: true };
  };

  const mapDecisionTier = (seniority: string, title: string): 'Primary' | 'Secondary' | 'Influencer' => {
    const seniorityLower = (seniority || '').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    
    const primaryKeywords = ['ceo', 'president', 'owner', 'founder', 'c suite', 'c-suite'];
    const secondaryKeywords = ['vp', 'vice president', 'director', 'manager'];
    
    if (primaryKeywords.some(keyword => seniorityLower.includes(keyword) || titleLower.includes(keyword))) {
      return 'Primary';
    }
    if (secondaryKeywords.some(keyword => seniorityLower.includes(keyword) || titleLower.includes(keyword))) {
      return 'Secondary';
    }
    
    return 'Influencer';
  };

  const processFile = async (file: File) => {
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
          const rows = results.data as ApolloContactRow[];
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
              const companyResult = await findOrCreateCompany(row, user.id);
              
              if (!companyResult) {
                importResult.errors.push(`Row ${i + 1}: Company required - ${row['First Name']} ${row['Last Name']}`);
                importResult.failed++;
                continue;
              }

              if (companyResult.created) {
                importResult.companiesCreated++;
              } else {
                importResult.companiesMatched++;
              }

              // Check if contact already exists
              const email = row['Email']?.trim();
              if (email) {
                const { data: existingContact } = await supabase
                  .from('contacts')
                  .select('id')
                  .eq('email', email)
                  .eq('company_id', companyResult.id)
                  .maybeSingle();

                if (existingContact) {
                  importResult.errors.push(`Row ${i + 1}: Contact exists - ${email}`);
                  importResult.failed++;
                  continue;
                }
              }

              // Determine best phone number
              let phone = cleanPhoneNumber(row['Work Direct Phone'] || row['Corporate Phone']);
              let mobile = cleanPhoneNumber(row['Mobile Phone']);

              // Create contact using the createContact function for proper scoring
              const contactData: any = {
                company_id: companyResult.id,
                first_name: row['First Name']?.trim() || '',
                last_name: row['Last Name']?.trim() || '',
                title: row['Title']?.trim() || null,
                email: email || null,
                phone: phone || null,
                mobile: mobile || null,
                linkedin_url: row['Person Linkedin Url']?.trim() || null,
                decision_tier: mapDecisionTier(row['Seniority'], row['Title']),
              };

              await createContact(contactData);
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
            file_name: 'Apollo Export',
            activity_type: 'IMPORT',
            table_name: 'contacts',
            affected_tables: ['contacts', 'companies'],
            record_count: importResult.total,
            successful_count: importResult.successful,
            failed_count: importResult.failed,
            file_format: 'CSV - Apollo',
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
          } else {
            toast({
              title: 'Import Failed',
              description: 'No contacts were imported. Check the errors below.',
              variant: 'destructive',
            });
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast({
            title: 'Error',
            description: 'Failed to parse CSV file. Make sure it\'s an Apollo export.',
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
    if (!file) return;
    await processFile(file);
    event.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        processFile(file);
      } else {
        toast({
          title: 'Invalid File',
          description: 'Please upload a CSV file',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Prevent closing during import or if results need to be reviewed
      if (!isOpen && (importing || result)) {
        return;
      }
      setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Building2 className="h-4 w-4 mr-2" />
          Import from Apollo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => {
        // Prevent closing when clicking outside - users must use buttons
        e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>Import Contacts from Apollo</DialogTitle>
          <DialogDescription>
            Upload your Apollo contact export CSV. All columns will be automatically mapped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Apollo Format:</strong> This import expects the standard Apollo contact export format.
              Companies will be created automatically with all available data including LinkedIn, website, and employee count.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label>Upload Apollo CSV Export</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your file here or click to browse
              </p>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${importing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !importing && document.getElementById('apollo-file-input')?.click()}
              >
                <input
                  id="apollo-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="hidden"
                />
                <Upload className={`mx-auto h-12 w-12 mb-4 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-sm font-medium mb-1">
                  {dragActive ? 'Drop your CSV file here' : 'Drag & drop your Apollo CSV export'}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse files
                </p>
              </div>
            </div>
          </div>

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Importing contacts from Apollo...</span>
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
                  <span>Contacts Imported: {result.successful}</span>
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
                  <Label className="text-destructive">Errors ({result.errors.length}):</Label>
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
