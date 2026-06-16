import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, AlertCircle, ListChecks, RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSessionTimeout } from '@/contexts/SessionTimeoutContext';
import {
  groupByCompany,
  importApolloData,
  type ImportResult,
  type CompanyWithContacts,
} from '@/lib/prospecting/importApolloCSV';

interface ApolloSavedList {
  id: string;
  name: string;
  cached_count: number | null;
  modified_at: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'list' | 'fetching' | 'preview' | 'importing' | 'complete';

export function ApolloSavedListImportDialog({ open, onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<Step>('list');
  const [loadingLists, setLoadingLists] = useState(false);
  const [lists, setLists] = useState<ApolloSavedList[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<ApolloSavedList | null>(null);
  const [maxRecords, setMaxRecords] = useState(500);
  const [grouped, setGrouped] = useState<CompanyWithContacts[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const { pauseTimeout, resumeTimeout } = useSessionTimeout();

  useEffect(() => {
    if (step === 'importing' || step === 'fetching') pauseTimeout();
    else resumeTimeout();
  }, [step]);

  useEffect(() => {
    if (open && step === 'list' && lists.length === 0) {
      loadLists();
    }
    if (!open) {
      // reset on close
      setTimeout(() => {
        setStep('list');
        setSelected(null);
        setGrouped([]);
        setResults(null);
        setProgress(0);
      }, 300);
    }
  }, [open]);

  const loadLists = async () => {
    setLoadingLists(true);
    try {
      const { data, error } = await supabase.functions.invoke('apollo-saved-lists', {
        body: { action: 'list' },
      });
      if (error) throw error;
      setLists((data?.labels || []) as ApolloSavedList[]);
    } catch (e: any) {
      toast({
        title: 'Failed to load Apollo lists',
        description: e.message || 'Check Apollo API key and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingLists(false);
    }
  };

  const handleFetch = async (list: ApolloSavedList) => {
    setSelected(list);
    setStep('fetching');
    try {
      const { data, error } = await supabase.functions.invoke('apollo-saved-lists', {
        body: { action: 'fetch', labelId: list.id, maxRecords, perPage: 100 },
      });
      if (error) throw error;
      const rows = (data?.rows || []) as any[];
      if (rows.length === 0) {
        toast({
          title: 'No records found',
          description: 'This Apollo list returned no people.',
          variant: 'destructive',
        });
        setStep('list');
        return;
      }
      const groupedData = groupByCompany(rows);
      setGrouped(groupedData);
      setStep('preview');
    } catch (e: any) {
      toast({
        title: 'Failed to fetch list',
        description: e.message || 'Apollo API error.',
        variant: 'destructive',
      });
      setStep('list');
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    try {
      const res = await importApolloData(grouped, (cur, tot) => {
        setProgress(Math.round((cur / tot) * 100));
      });
      setResults(res);
      setStep('complete');
      onImportComplete();
    } catch (e: any) {
      toast({
        title: 'Import failed',
        description: e.message,
        variant: 'destructive',
      });
      setStep('preview');
    }
  };

  const filtered = lists.filter(l =>
    l.name?.toLowerCase().includes(filter.toLowerCase())
  );

  const totalContacts = grouped.reduce((s, c) => s + c.contacts.length, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && step !== 'importing' && step !== 'fetching') onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl h-[85vh] overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (step === 'importing' || step === 'fetching') e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Import from Apollo Saved List
          </DialogTitle>
          <DialogDescription>
            Pulls companies and contacts directly from your Apollo saved lists — no CSV export required.
          </DialogDescription>
        </DialogHeader>

        {step === 'list' && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search lists..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <Button variant="outline" size="icon" onClick={loadLists} disabled={loadingLists}>
                <RefreshCw className={`h-4 w-4 ${loadingLists ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Max records per import:</span>
              <Input
                type="number"
                min={1}
                max={1000}
                value={maxRecords}
                onChange={(e) => setMaxRecords(Math.max(1, Math.min(1000, parseInt(e.target.value) || 500)))}
                className="w-24 h-8"
              />
            </div>

            <ScrollArea className="h-full border rounded-md min-h-0">
              {loadingLists ? (
                <div className="p-8 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading saved lists...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No saved lists found in your Apollo account.
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-3 hover:bg-accent/50"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{l.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.cached_count != null ? `${l.cached_count} records` : 'Size unknown'}
                          {l.modified_at && ` · Updated ${new Date(l.modified_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleFetch(l)}>
                        <Download className="h-4 w-4 mr-1" /> Fetch
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {step === 'fetching' && (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Fetching up to {maxRecords} records from "{selected?.name}"...
            </p>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="border rounded-md p-4 bg-accent/30">
              <div className="text-sm font-medium">{selected?.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {grouped.length} companies · {totalContacts} contacts ready to import
              </div>
            </div>
            <ScrollArea className="h-64 border rounded-md">
              <div className="divide-y text-sm">
                {grouped.slice(0, 50).map((c, i) => (
                  <div key={i} className="p-2">
                    <div className="font-medium">{c.companyData.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.companyData.state || '—'} · {c.contacts.length} contact(s) · {c.companyData.industry_type}
                    </div>
                  </div>
                ))}
                {grouped.length > 50 && (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    + {grouped.length - 50} more...
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('list')}>Back</Button>
              <Button onClick={handleImport}>Import {grouped.length} companies</Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-10 space-y-4">
            <div className="flex items-center gap-2 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Importing... {progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {step === 'complete' && results && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Import complete</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border rounded-md p-3">
                <div className="text-2xl font-bold">{results.companiesCreated}</div>
                <div className="text-xs text-muted-foreground">Companies</div>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-2xl font-bold">{results.contactsCreated}</div>
                <div className="text-xs text-muted-foreground">Contacts</div>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-2xl font-bold">{results.duplicatesSkipped}</div>
                <div className="text-xs text-muted-foreground">Duplicates</div>
              </div>
            </div>
            {results.errors.length > 0 && (
              <div className="border rounded-md p-3 max-h-32 overflow-auto">
                <div className="flex items-center gap-1 text-destructive text-sm font-medium mb-1">
                  <AlertCircle className="h-4 w-4" /> {results.errors.length} error(s)
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {results.errors.slice(0, 10).map((e, i) => <li key={i}>· {e}</li>)}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setStep('list'); setResults(null); setGrouped([]); setSelected(null); }}>
                Import another list
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
