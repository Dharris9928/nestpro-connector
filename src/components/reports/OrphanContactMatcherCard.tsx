import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2, Check, X, Link2 } from 'lucide-react';

interface PendingMatch {
  id: string;
  contact_id: string;
  company_id: string;
  match_method: string;
  match_confidence: number;
  match_signal: string | null;
  status: string;
  created_at: string;
  contacts?: { first_name: string | null; last_name: string | null; email: string | null } | null;
  companies?: { company_name: string | null } | null;
}

export function OrphanContactMatcherCard() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [pending, setPending] = useState<PendingMatch[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const loadPending = async () => {
    setLoadingPending(true);
    const { data, error } = await supabase
      .from('contact_company_matches')
      .select('id, contact_id, company_id, match_method, match_confidence, match_signal, status, created_at, contacts(first_name, last_name, email), companies(company_name)')
      .eq('status', 'pending')
      .order('match_confidence', { ascending: false })
      .limit(100);
    if (error) {
      toast({ title: 'Failed to load pending matches', description: error.message, variant: 'destructive' });
    } else {
      setPending((data as any) || []);
    }
    setLoadingPending(false);
  };

  useEffect(() => { loadPending(); }, []);

  const runMatcher = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('match-orphan-contacts', {
      body: { limit: 500 },
    });
    setRunning(false);
    if (error) {
      toast({ title: 'Matcher failed', description: error.message, variant: 'destructive' });
      return;
    }
    setLastResult(data);
    toast({
      title: 'Matching complete',
      description: `Scanned ${data?.scanned} · Auto-linked ${data?.autoLinked} · Queued ${data?.queued} · Skipped ${data?.skipped}`,
    });
    loadPending();
  };

  const decide = async (id: string, contact_id: string, company_id: string, approve: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (approve) {
      const { error: linkErr } = await supabase.from('contacts').update({ company_id }).eq('id', contact_id);
      if (linkErr) {
        toast({ title: 'Link failed', description: linkErr.message, variant: 'destructive' });
        return;
      }
    }
    await supabase
      .from('contact_company_matches')
      .update({ status: approve ? 'approved' : 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    setPending(p => p.filter(x => x.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Orphan Contact Matcher</CardTitle>
          </div>
          <Button onClick={runMatcher} disabled={running} size="sm">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
            Run matching
          </Button>
        </div>
        <CardDescription>
          Finds contacts with no company and links them by email domain or LinkedIn URL.
          High-confidence matches (≥90%) auto-link; lower confidence goes to review below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded border p-3"><div className="text-muted-foreground">Scanned</div><div className="text-2xl font-bold">{lastResult.scanned}</div></div>
            <div className="rounded border p-3"><div className="text-muted-foreground">Auto-linked</div><div className="text-2xl font-bold text-green-600">{lastResult.autoLinked}</div></div>
            <div className="rounded border p-3"><div className="text-muted-foreground">Queued</div><div className="text-2xl font-bold">{lastResult.queued}</div></div>
            <div className="rounded border p-3"><div className="text-muted-foreground">Skipped</div><div className="text-2xl font-bold text-muted-foreground">{lastResult.skipped}</div></div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Pending review ({pending.length})</h4>
            <Button variant="ghost" size="sm" onClick={loadPending} disabled={loadingPending}>Refresh</Button>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No pending matches</p>
          ) : (
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-2">
                {pending.map(m => {
                  const cname = [m.contacts?.first_name, m.contacts?.last_name].filter(Boolean).join(' ') || m.contacts?.email || 'Unknown contact';
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-3 border rounded p-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{cname} → {m.companies?.company_name || 'Unknown company'}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.match_signal} · {m.match_method}</div>
                      </div>
                      <Badge variant="outline">{m.match_confidence}%</Badge>
                      <Button size="sm" variant="outline" onClick={() => decide(m.id, m.contact_id, m.company_id, true)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => decide(m.id, m.contact_id, m.company_id, false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
