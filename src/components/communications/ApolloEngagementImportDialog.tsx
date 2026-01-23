import { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle, Mail, Eye } from 'lucide-react';
import {
  autoDetectColumns,
  parseOpenedEmails,
  matchOpenedEmails,
  updateOpenedEmails,
  OpenedEmailRow,
  MatchResult,
  MatchedRecord,
} from '@/lib/apollo/importOpenedEmails';

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

interface ApolloEngagementImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function ApolloEngagementImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ApolloEngagementImportDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string | null>>({
    email: null,
    subject: null,
    openedAt: null,
    openCount: null,
    apolloId: null,
    sentAt: null,
  });
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ updated: number; errors: string[] } | null>(null);

  const resetDialog = useCallback(() => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setRawData([]);
    setColumnMapping({
      email: null,
      subject: null,
      openedAt: null,
      openCount: null,
      apolloId: null,
      sentAt: null,
    });
    setMatchResult(null);
    setImportProgress(0);
    setImportStats(null);
  }, []);

  const handleClose = useCallback(() => {
    if (step === 'importing') return; // Prevent closing during import
    resetDialog();
    onOpenChange(false);
  }, [step, resetDialog, onOpenChange]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    if (uploadedFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvHeaders = results.meta.fields || [];
        const csvData = results.data as Record<string, string>[];
        
        setHeaders(csvHeaders);
        setRawData(csvData);
        
        // Auto-detect column mappings
        const detected = autoDetectColumns(csvHeaders);
        setColumnMapping(detected);
        
        setStep('mapping');
      },
      error: (error) => {
        toast({
          title: 'Parse error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }, [toast]);

  const handleColumnChange = useCallback((field: string, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value === '_none_' ? null : value,
    }));
  }, []);

  const handlePreview = useCallback(async () => {
    if (!columnMapping.email || !columnMapping.openedAt) {
      toast({
        title: 'Required fields missing',
        description: 'Please map at least Email and Opened At columns',
        variant: 'destructive',
      });
      return;
    }

    try {
      setStep('preview');
      
      // Parse the CSV data with current mappings
      const parsedRows = parseOpenedEmails(rawData, columnMapping);
      
      if (parsedRows.length === 0) {
        toast({
          title: 'No opened emails found',
          description: 'The CSV does not contain any emails with opened timestamps',
          variant: 'destructive',
        });
        setStep('mapping');
        return;
      }

      // Match against database
      const result = await matchOpenedEmails(parsedRows);
      setMatchResult(result);
    } catch (error: any) {
      toast({
        title: 'Matching error',
        description: error.message,
        variant: 'destructive',
      });
      setStep('mapping');
    }
  }, [columnMapping, rawData, toast]);

  const handleImport = useCallback(async () => {
    if (!matchResult || matchResult.matched.length === 0) return;

    setStep('importing');
    setImportProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 5, 90));
      }, 100);

      const result = await updateOpenedEmails(matchResult.matched);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportStats(result);
      setStep('complete');

      if (result.updated > 0) {
        toast({
          title: 'Import complete',
          description: `Successfully updated ${result.updated} email records`,
        });
        onImportComplete?.();
      }
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
      setStep('preview');
    }
  }, [matchResult, toast, onImportComplete]);

  // Stats for preview
  const previewStats = useMemo(() => {
    if (!matchResult) return null;
    
    const byApolloId = matchResult.matched.filter(m => m.matchType === 'apollo_id').length;
    const byEmailSubject = matchResult.matched.filter(m => m.matchType === 'email_subject').length;
    const byEmailOnly = matchResult.matched.filter(m => m.matchType === 'email_only').length;
    
    return {
      total: matchResult.totalCsvRows,
      matched: matchResult.matched.length,
      unmatched: matchResult.unmatched.length,
      byApolloId,
      byEmailSubject,
      byEmailOnly,
    };
  }, [matchResult]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => step === 'importing' && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Import Apollo Opened Emails
          </DialogTitle>
          <DialogDescription>
            Upload an Apollo CSV export to update email engagement data
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="py-8">
              <label
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <span className="text-sm font-medium">Drop your Apollo CSV here</span>
                <span className="text-xs text-muted-foreground mt-1">or click to browse</span>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              
              <Alert className="mt-4">
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Export your opened emails from Apollo's "Email Activity" or "Sequence Stats" and upload the CSV here.
                  We'll match emails by Apollo ID, email address, or subject line.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{file?.name}</span>
                <Badge variant="secondary">{rawData.length} rows</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email-col">Email Column *</Label>
                  <Select
                    value={columnMapping.email || '_none_'}
                    onValueChange={(v) => handleColumnChange('email', v)}
                  >
                    <SelectTrigger id="email-col">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="opened-col">Opened At Column *</Label>
                  <Select
                    value={columnMapping.openedAt || '_none_'}
                    onValueChange={(v) => handleColumnChange('openedAt', v)}
                  >
                    <SelectTrigger id="opened-col">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject-col">Subject Column</Label>
                  <Select
                    value={columnMapping.subject || '_none_'}
                    onValueChange={(v) => handleColumnChange('subject', v)}
                  >
                    <SelectTrigger id="subject-col">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="apollo-id-col">Apollo Message ID</Label>
                  <Select
                    value={columnMapping.apolloId || '_none_'}
                    onValueChange={(v) => handleColumnChange('apolloId', v)}
                  >
                    <SelectTrigger id="apollo-id-col">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="count-col">Open Count</Label>
                  <Select
                    value={columnMapping.openCount || '_none_'}
                    onValueChange={(v) => handleColumnChange('openCount', v)}
                  >
                    <SelectTrigger id="count-col">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={handlePreview}>
                  Preview Matches
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && matchResult && previewStats && (
            <div className="space-y-4 py-4">
              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{previewStats.total}</div>
                  <div className="text-xs text-muted-foreground">Opened in CSV</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{previewStats.matched}</div>
                  <div className="text-xs text-muted-foreground">Matched</div>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{previewStats.unmatched}</div>
                  <div className="text-xs text-muted-foreground">Unmatched</div>
                </div>
              </div>

              {/* Match breakdown */}
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="bg-green-500/10">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Apollo ID: {previewStats.byApolloId}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10">
                  Email+Subject: {previewStats.byEmailSubject}
                </Badge>
                <Badge variant="outline" className="bg-amber-500/10">
                  Email only: {previewStats.byEmailOnly}
                </Badge>
              </div>

              {/* Preview table */}
              <ScrollArea className="h-[250px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Match Type</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResult.matched.slice(0, 50).map((match, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs truncate max-w-[150px]">
                          {match.csvRow.email}
                        </TableCell>
                        <TableCell className="truncate max-w-[150px]">
                          {match.csvRow.subject || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {match.matchType === 'apollo_id' ? 'ID' : 
                             match.matchType === 'email_subject' ? 'Email+Subj' : 'Email'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={match.confidence >= 85 ? 'text-green-600' : 'text-amber-600'}>
                            {match.confidence}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {matchResult.matched.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          ... and {matchResult.matched.length - 50} more
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={matchResult.matched.length === 0}
                >
                  Update {matchResult.matched.length} Records
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="py-8 space-y-4">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">Updating email records...</div>
                <p className="text-sm text-muted-foreground">Please don't close this dialog</p>
              </div>
              <Progress value={importProgress} className="h-2" />
              <div className="text-center text-sm text-muted-foreground">
                {importProgress}% complete
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && importStats && (
            <div className="py-8 space-y-4">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <div className="text-lg font-medium">Import Complete!</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{importStats.updated}</div>
                  <div className="text-sm text-muted-foreground">Records Updated</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{importStats.errors.length}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {importStats.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Some records failed to update:</div>
                    <ul className="text-xs space-y-1 max-h-20 overflow-y-auto">
                      {importStats.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {importStats.errors.length > 5 && (
                        <li>...and {importStats.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
