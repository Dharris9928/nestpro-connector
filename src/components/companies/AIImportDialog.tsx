import { useState, useEffect } from 'react';
import { useSessionTimeout } from '@/contexts/SessionTimeoutContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import * as XLSX from '@e965/xlsx';
import { AIImportReviewStep } from './AIImportReviewStep';
import { createCompany } from '@/lib/companies/createCompany';
import { createContact } from '@/lib/contacts/createContact';
import { generateBatchId } from '@/lib/import/batchTracking';

interface AIImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  targetTable: 'companies' | 'contacts';
}

type Step = 'upload' | 'analyzing' | 'review-mappings' | 'review-data' | 'importing' | 'complete';

interface FieldMapping {
  csvColumn: string;
  crmField: string;
  confidence: number;
  parseStrategy: string;
  notes?: string;
}

interface ParsedRow {
  rowIndex: number;
  parsedData: any;
  confidence: number;
  warnings: string[];
  detectedIndustry?: string;
  accepted: boolean;
}

export function AIImportDialog({ open, onClose, onImportComplete, targetTable }: AIImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [allRows, setAllRows] = useState<any[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [overallConfidence, setOverallConfidence] = useState(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });
  const { toast } = useToast();
  const { pauseTimeout, resumeTimeout } = useSessionTimeout();

  useEffect(() => {
    if (step === 'importing' || step === 'analyzing') pauseTimeout();
    else resumeTimeout();
  }, [step]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx|xls)$/)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV or Excel file',
        variant: 'destructive'
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive'
      });
      return;
    }

    setFile(selectedFile);
  };

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const analyzeFile = async () => {
    if (!file) return;

    setStep('analyzing');
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        throw new Error('No data found in file');
      }

      setAllRows(rows);
      const headers = Object.keys(rows[0]);
      const sampleRows = rows.slice(0, 10);

      const { data, error } = await supabase.functions.invoke('ai-parse-import', {
        body: {
          headers,
          sampleRows,
          tableType: targetTable
        }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast({
            title: 'Rate limit exceeded',
            description: 'Please wait a moment and try again',
            variant: 'destructive'
          });
        } else if (data.error.includes('credits')) {
          toast({
            title: 'AI credits exhausted',
            description: 'Please add credits to continue using AI Import',
            variant: 'destructive'
          });
        } else {
          throw new Error(data.error);
        }
        setStep('upload');
        return;
      }

      const result = data.data;
      setFieldMappings(result.fieldMappings);
      setOverallConfidence(result.overallConfidence);
      setRecommendations(result.recommendations || []);

      // Parse ALL rows using AI mappings
      const allParsedRows = rows.map((row, idx) => {
        const parsedData: any = {};
        result.fieldMappings.forEach((mapping: FieldMapping) => {
          const value = row[mapping.csvColumn];
          if (value !== undefined && value !== null && value !== '') {
            parsedData[mapping.crmField] = value;
          }
        });
        
        // Use confidence from sample if available, otherwise default to 85
        const sampleRow = result.parsedRows.find((r: any) => r.rowIndex === idx);
        return {
          rowIndex: idx,
          parsedData,
          confidence: sampleRow?.confidence || 85,
          warnings: sampleRow?.warnings || [],
          detectedIndustry: sampleRow?.detectedIndustry,
          accepted: true // Default all to accepted
        };
      });

      setParsedRows(allParsedRows);
      setStep('review-data');

    } catch (error) {
      console.error('Error analyzing file:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze file',
        variant: 'destructive'
      });
      setStep('upload');
    }
  };

  const handleImport = async () => {
    setStep('importing');
    const acceptedRows = parsedRows.filter(row => row.accepted);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < acceptedRows.length; i++) {
      const row = acceptedRows[i];
      try {
        if (targetTable === 'companies') {
          await createCompany(row.parsedData);
        } else {
          await createContact(row.parsedData);
        }
        successCount++;
      } catch (error) {
        console.error(`Failed to import row ${row.rowIndex}:`, error);
        failedCount++;
      }
      setImportProgress(Math.round(((i + 1) / acceptedRows.length) * 100));
      setImportStats({ success: successCount, failed: failedCount });
    }

    setStep('complete');
    
    // Log import activity with batch tracking
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const batchId = generateBatchId();
      try {
        await supabase.from('import_export_logs').insert({
          user_id: user.id,
          batch_id: batchId,
          file_name: file?.name || 'AI Import',
          activity_type: 'IMPORT',
          table_name: targetTable,
          affected_tables: targetTable === 'companies' ? ['companies', 'contacts'] : ['contacts'],
          record_count: acceptedRows.length,
          successful_count: successCount,
          failed_count: failedCount,
          file_format: file?.name.split('.').pop()?.toUpperCase(),
          rollback_available: true,
        });
      } catch (error) {
        console.error('Failed to log import activity:', error);
      }
    }
    
    onImportComplete();
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setAllRows([]);
    setFieldMappings([]);
    setParsedRows([]);
    setOverallConfidence(0);
    setRecommendations([]);
    setImportProgress(0);
    setImportStats({ success: 0, failed: 0 });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Import - {targetTable === 'companies' ? 'Companies' : 'Contacts'}
          </DialogTitle>
        </DialogHeader>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-6 py-6">
            <div className="text-center">
              <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Your File</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Upload a CSV or Excel file. Our AI will automatically detect fields and parse your data.
              </p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <span className="text-sm font-medium">Click to upload or drag and drop</span>
                <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, XLS (max 10MB)</p>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </Label>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button onClick={analyzeFile}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze with AI
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Analyzing Step */}
        {step === 'analyzing' && (
          <div className="space-y-6 py-12 text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Analyzing your file...</h3>
              <p className="text-sm text-muted-foreground">AI is detecting fields and parsing data</p>
            </div>
          </div>
        )}

        {/* Review Data Step */}
        {step === 'review-data' && (
          <AIImportReviewStep
            fieldMappings={fieldMappings}
            parsedRows={parsedRows}
            onUpdateRows={setParsedRows}
            overallConfidence={overallConfidence}
            recommendations={recommendations}
            onImport={handleImport}
            onBack={() => setStep('upload')}
          />
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="space-y-6 py-12">
            <div className="text-center mb-6">
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Importing records...</h3>
              <p className="text-sm text-muted-foreground">
                {importStats.success} of {parsedRows.filter(r => r.accepted).length} imported
              </p>
            </div>
            <Progress value={importProgress} className="h-2" />
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="space-y-6 py-12 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
              <div className="flex justify-center gap-4 mt-4">
                <Badge variant="outline" className="text-green-600">
                  ✓ {importStats.success} successful
                </Badge>
                {importStats.failed > 0 && (
                  <Badge variant="outline" className="text-destructive">
                    ✗ {importStats.failed} failed
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
