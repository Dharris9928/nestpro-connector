import { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle, Mail, Eye, MousePointerClick, MessageSquare } from 'lucide-react';
import {
  autoDetectColumns,
  parseOpenedEmails,
  matchOpenedEmails,
  updateOpenedEmails,
  OpenedEmailRow,
  MatchResult,
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
  const queryClient = useQueryClient();
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
    opened: null,
    clicked: null,
    replied: null,
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
      opened: null,
      clicked: null,
      replied: null,
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

  // Check if we have a valid open indicator (either boolean or timestamp)
  const hasOpenIndicator = columnMapping.opened || columnMapping.openedAt;

  const sentAtLooksBoolean = useMemo(() => {
    if (!columnMapping.sentAt || rawData.length === 0) return false;
    const col = columnMapping.sentAt;
    const sample = rawData.find(r => (r[col] ?? '').toString().trim().length > 0)?.[col];
    if (sample === null || sample === undefined) return false;
    const v = sample.toString().toLowerCase().trim();
    return v === 'true' || v === 'false' || v === 'yes' || v === 'no' || v === '1' || v === '0';
  }, [columnMapping.sentAt, rawData]);

  // Count rows where Open = true for preview
  const openedRowsCount = useMemo(() => {
    if (!rawData.length) return 0;
    
    if (columnMapping.opened) {
      return rawData.filter(row => {
        const val = row[columnMapping.opened!]?.toLowerCase().trim();
        return val === 'true' || val === 'yes' || val === '1';
      }).length;
    }
    
    if (columnMapping.openedAt) {
      return rawData.filter(row => row[columnMapping.openedAt!]?.trim()).length;
    }
    
    return 0;
  }, [rawData, columnMapping.opened, columnMapping.openedAt]);

  // Count clicked and replied
  const engagementCounts = useMemo(() => {
    if (!rawData.length) return { clicked: 0, replied: 0 };
    
    let clicked = 0;
    let replied = 0;
    
    if (columnMapping.clicked) {
      clicked = rawData.filter(row => {
        const val = row[columnMapping.clicked!]?.toLowerCase().trim();
        return val === 'true' || val === 'yes' || val === '1';
      }).length;
    }
    
    if (columnMapping.replied) {
      replied = rawData.filter(row => {
        const val = row[columnMapping.replied!]?.toLowerCase().trim();
        return val === 'true' || val === 'yes' || val === '1';
      }).length;
    }
    
    return { clicked, replied };
  }, [rawData, columnMapping.clicked, columnMapping.replied]);

  const handlePreview = useCallback(async () => {
    if (!columnMapping.email) {
      toast({
        title: 'Required field missing',
        description: 'Please map the Email column',
        variant: 'destructive',
      });
      return;
    }

    if (!hasOpenIndicator) {
      toast({
        title: 'Required field missing',
        description: 'Please map either the "Open" (boolean) or "Opened At" (timestamp) column',
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
          description: 'The CSV does not contain any emails marked as opened',
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
  }, [columnMapping, rawData, toast, hasOpenIndicator]);

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
        // Invalidate all related queries for immediate dashboard refresh
        queryClient.invalidateQueries({ queryKey: ["pipeline-analytics"] });
        queryClient.invalidateQueries({ queryKey: ["communications-funnel"] });
        queryClient.invalidateQueries({ queryKey: ["all-communications"] });
        queryClient.invalidateQueries({ queryKey: ["apollo-email-activities"] });

        toast({
          title: 'Import complete',
          description: `Successfully updated ${result.updated} email records. Dashboard metrics will refresh automatically.`,
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
    const withClicks = matchResult.matched.filter(m => m.csvRow.clicked).length;
    const withReplies = matchResult.matched.filter(m => m.csvRow.replied).length;
    
    return {
      total: matchResult.totalCsvRows,
      matched: matchResult.matched.length,
      unmatched: matchResult.unmatched.length,
      byApolloId,
      byEmailSubject,
      byEmailOnly,
      withClicks,
      withReplies,
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
            Import Apollo Email Engagement
          </DialogTitle>
          <DialogDescription>
            Upload an Apollo CSV export to update email open, click, and reply data
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
                  Export your messages from Apollo with Open, Click, and Replied columns.
                  We'll match emails by subject line and email address.
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

              {/* Required Fields */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Required Fields</h4>
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
                    <Label htmlFor="opened-bool-col">Open Status (Boolean) *</Label>
                    <Select
                      value={columnMapping.opened || '_none_'}
                      onValueChange={(v) => handleColumnChange('opened', v)}
                    >
                      <SelectTrigger id="opened-bool-col">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">-- Not mapped --</SelectItem>
                        {headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Column with true/false values (e.g., "Open")
                    </p>
                  </div>
                </div>
              </div>

              {/* Matching Fields */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Matching Fields</h4>
                <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Improves matching accuracy
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="sent-col">Sent At Column</Label>
                    <Select
                      value={columnMapping.sentAt || '_none_'}
                      onValueChange={(v) => handleColumnChange('sentAt', v)}
                    >
                      <SelectTrigger id="sent-col">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">-- Not mapped --</SelectItem>
                        {headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used as opened_at timestamp
                    </p>

                    {sentAtLooksBoolean && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          The selected “Sent At” column looks like true/false (e.g., “Sent”).
                          Please choose “Sent At (PST)” so timestamps can be parsed correctly.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Engagement */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Additional Engagement (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clicked-col">Click Status</Label>
                    <Select
                      value={columnMapping.clicked || '_none_'}
                      onValueChange={(v) => handleColumnChange('clicked', v)}
                    >
                      <SelectTrigger id="clicked-col">
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
                    <Label htmlFor="replied-col">Replied Status</Label>
                    <Select
                      value={columnMapping.replied || '_none_'}
                      onValueChange={(v) => handleColumnChange('replied', v)}
                    >
                      <SelectTrigger id="replied-col">
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
              </div>

              {/* Preview counts */}
              {openedRowsCount > 0 && (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="flex items-center gap-4">
                    <span><strong>{openedRowsCount}</strong> emails marked as opened</span>
                    {engagementCounts.clicked > 0 && (
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" />
                        {engagementCounts.clicked} clicked
                      </span>
                    )}
                    {engagementCounts.replied > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {engagementCounts.replied} replied
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={handlePreview} disabled={!columnMapping.email || !hasOpenIndicator}>
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
              <div className="flex flex-wrap gap-2 text-xs">
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
                {previewStats.withClicks > 0 && (
                  <Badge variant="outline" className="bg-purple-500/10">
                    <MousePointerClick className="h-3 w-3 mr-1" />
                    Clicks: {previewStats.withClicks}
                  </Badge>
                )}
                {previewStats.withReplies > 0 && (
                  <Badge variant="outline" className="bg-indigo-500/10">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Replies: {previewStats.withReplies}
                  </Badge>
                )}
              </div>

              {/* Preview table */}
              <ScrollArea className="h-[250px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Match Type</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResult.matched.slice(0, 50).map((match, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs truncate max-w-[120px]">
                          {match.csvRow.email}
                        </TableCell>
                        <TableCell className="truncate max-w-[120px]">
                          {match.csvRow.subject || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Eye className="h-3 w-3 text-green-600" />
                            {match.csvRow.clicked && <MousePointerClick className="h-3 w-3 text-purple-600" />}
                            {match.csvRow.replied && <MessageSquare className="h-3 w-3 text-indigo-600" />}
                          </div>
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
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
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
            <div className="py-12 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-lg font-medium">Updating records...</span>
              </div>
              <Progress value={importProgress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                This may take a moment...
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && importStats && (
            <div className="py-8 space-y-4">
              <div className="flex flex-col items-center gap-3">
                {importStats.errors.length === 0 ? (
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-amber-500" />
                )}
                <span className="text-xl font-medium">Import Complete</span>
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
                <ScrollArea className="h-[100px] rounded-md border p-3">
                  <div className="space-y-1">
                    {importStats.errors.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{err}</span>
                      </div>
                    ))}
                    {importStats.errors.length > 10 && (
                      <div className="text-xs text-muted-foreground">
                        ... and {importStats.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </ScrollArea>
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
