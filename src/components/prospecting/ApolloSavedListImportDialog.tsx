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
  modality: 'contact' | 'account';
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'list' | 'fetching' | 'preview' | 'importing' | 'complete';

const normalizeListType = (modality: unknown): 'contact' | 'account' => {
  const value = String(modality || '').toLowerCase();
  return value === 'account' || value === 'accounts' ? 'account' : 'contact';
};

export function ApolloSavedListImportDialog({ open, onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<Step>('list');
  const [loadingLists, setLoadingLists] = useState(false);
  const [lists, setLists] = useState<ApolloSavedList[]>([]);
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'contact' | 'account'>('all');
  const [selected, setSelected] = useState<ApolloSavedList | null>(null);
  const [autoMax, setAutoMax] = useState(true);
  const [maxRecords, setMaxRecords] = useState(2000);
  const [grouped, setGrouped] = useState<CompanyWithContacts[]>([]);
  const [dupScan, setDupScan] = useState<{ companies: number; contacts: number; scanning: boolean } | null>(null);
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
      setLists(((data?.labels || []) as ApolloSavedList[]).map((list) => ({
        ...list,
        modality: normalizeListType(list.modality),
      })));
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
    // Auto-determine cap from list size (with 15k hard ceiling), else use manual maxRecords
    const effectiveMax = autoMax
      ? Math.min(15000, Math.max(1, list.cached_count ?? maxRecords))
      : maxRecords;
    try {
      const { data, error } = await supabase.functions.invoke('apollo-saved-lists', {
        body: { action: 'fetch', labelId: list.id, maxRecords: effectiveMax, perPage: 100, labelType: list.modality },
      });
      if (error) throw error;
      const rows = (data?.rows || []) as any[];
      if (rows.length === 0) {
        toast({
          title: 'No records found',
          description: `This Apollo ${list.modality === 'account' ? 'company' : 'people'} list returned no records.`,
          variant: 'destructive',
        });
        setStep('list');
        return;
      }
      const groupedData = groupByCompany(rows);
      setGrouped(groupedData);
      setStep('preview');
      scanForDuplicates(groupedData);
    } catch (e: any) {
      toast({
        title: 'Failed to fetch list',
        description: e.message || 'Apollo API error.',
        variant: 'destructive',
      });
      setStep('list');
    }
  };

  const scanForDuplicates = async (data: CompanyWithContacts[]) => {
    setDupScan({ companies: 0, contacts: 0, scanning: true });
    try {
      const companyNames = data.map(d => d.companyData.company_name).filter(Boolean) as string[];
      const emails = data.flatMap(d => d.contacts.map(c => c.email).filter(Boolean)) as string[];

      // Batch in chunks of 500 to keep URL/IN clauses sane
      const chunk = <T,>(arr: T[], n: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
        return out;
      };

      const dupCompanies = new Set<string>();
      for (const batch of chunk(companyNames, 500)) {
        const { data: rows } = await supabase
          .from('companies')
          .select('company_name')
          .in('company_name', batch);
        rows?.forEach((r: any) => dupCompanies.add(r.company_name.toLowerCase()));
      }

      let dupContacts = 0;
      for (const batch of chunk(emails, 500)) {
        const { data: rows } = await supabase
          .from('contacts')
          .select('email')
          .in('email', batch);
        dupContacts += rows?.length || 0;
      }

      setDupScan({ companies: dupCompanies.size, contacts: dupContacts, scanning: false });
    } catch (e) {
      console.error('Duplicate scan failed:', e);
      setDupScan(null);
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

  const filtered = lists.filter(l => {
    const matchesText = l.name?.toLowerCase().includes(filter.toLowerCase());
    const matchesType = filterType === 'all' || l.modality === filterType;
    return matchesText && matchesType;
  });

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

            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Button
                variant={autoMax ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7"
                onClick={() => setAutoMax(v => !v)}
              >
                {autoMax ? '✓ Auto-size' : 'Auto-size'}
              </Button>
              <span className="text-muted-foreground">
                {autoMax ? 'Fetches the entire list (up to 15,000)' : 'Max records:'}
              </span>
              {!autoMax && (
                <Input
                  type="number"
                  min={1}
                  max={15000}
                  value={maxRecords}
                  onChange={(e) => setMaxRecords(Math.max(1, Math.min(15000, parseInt(e.target.value) || 2000)))}
                  className="w-24 h-8"
                />
              )}
            </div>

            <div className="flex items-center gap-1">
              {(['all', 'contact', 'account'] as const).map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFilterType(type)}
                >
                  {type === 'all' ? 'All' : type === 'contact' ? 'People' : 'Companies'}
                </Button>
              ))}
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{l.name}</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            l.modality === 'account'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          }`}>
                            {l.modality === 'account' ? 'Company' : 'People'}
                          </span>
                        </div>
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
              Fetching {autoMax ? (selected?.cached_count ?? 'all') : `up to ${maxRecords}`} records from "{selected?.name}"...
            </p>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="border rounded-md p-4 bg-accent/30">
              <div className="text-sm font-medium flex items-center gap-2">
                {selected?.name}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  selected?.modality === 'account'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>
                  {selected?.modality === 'account' ? 'Company List' : 'People List'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {selected?.modality === 'account'
                  ? `${grouped.length} companies ready to import`
                  : `${grouped.length} companies · ${totalContacts} contacts ready to import`
                }
              </div>
              <div className="text-xs mt-2">
                {dupScan?.scanning ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Scanning CRM for duplicates...
                  </span>
                ) : dupScan ? (
                  <span className="text-amber-700 dark:text-amber-400">
                    Duplicates already in CRM: {dupScan.companies} companies
                    {selected?.modality !== 'account' && ` · ${dupScan.contacts} contacts`}
                    {' '}(will be skipped on import)
                  </span>
                ) : null}
              </div>
            </div>
            <ScrollArea className="h-64 border rounded-md">
              <div className="divide-y text-sm">
                {grouped.slice(0, 50).map((c, i) => (
                  <div key={i} className="p-2">
                    <div className="font-medium">{c.companyData.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.companyData.state || '—'}
                      {selected?.modality !== 'account' && ` · ${c.contacts.length} contact(s)`}
                      {` · ${c.companyData.industry_type}`}
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
              <Button onClick={handleImport}>
                Import {selected?.modality === 'account' ? `${grouped.length} companies` : `${grouped.length} companies`}
              </Button>
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
