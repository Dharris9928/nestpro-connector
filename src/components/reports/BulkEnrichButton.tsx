import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, StopCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Tier = 'free' | 'standard' | 'premium';

// Free-tier directive: Deepseek → Gemini  (no paid APIs)
// Standard:           Deepseek → Gemini → Apollo
// Premium:            Deepseek → Gemini → Apollo → Claude
const TIER_PROVIDERS: Record<Tier, ('deepseek' | 'gemini' | 'apollo' | 'claude')[]> = {
  free: ['deepseek', 'gemini'],
  standard: ['deepseek', 'gemini', 'apollo'],
  premium: ['deepseek', 'gemini', 'apollo', 'claude'],
};

const TIER_LABEL: Record<Tier, string> = {
  free: 'Free Tier (Deepseek → Gemini)',
  standard: 'Standard (+ Apollo)',
  premium: 'Premium (+ Claude)',
};

const CHUNK_SIZE = 25;     // companies pulled per page
const CONCURRENCY = 4;     // parallel enrichments per chunk

interface Props {
  onComplete?: () => void;
}

export function BulkEnrichButton({ onComplete }: Props) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const stopRef = useRef(false);
  const { toast } = useToast();

  const run = async (tier: Tier) => {
    setRunning(true);
    stopRef.current = false;
    const providers = TIER_PROVIDERS[tier];

    let processed = 0;
    let success = 0;
    let errors = 0;
    let cursor: string | null = null;

    setProgress('Starting…');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      while (!stopRef.current) {
        // Pull next page of companies needing v2 strategic enrichment
        let q = supabase
          .from('companies')
          .select('id, company_name')
          .is('builder_segment', null)
          .order('id', { ascending: true })
          .limit(CHUNK_SIZE);
        if (cursor) q = q.gt('id', cursor);

        const { data: rows, error } = await q;
        if (error) throw error;
        if (!rows || rows.length === 0) break;

        // Concurrent enrichment within chunk
        let idx = 0;
        const workers = Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
          while (!stopRef.current) {
            const i = idx++;
            if (i >= rows.length) return;
            const row = rows[i];
            try {
              const { error: invokeErr } = await supabase.functions.invoke('enrich-company', {
                body: { companyId: row.id, providers, deepEnrich: false },
              });
              if (invokeErr) throw invokeErr;
              success++;
            } catch (e: any) {
              errors++;
              console.warn('Enrich failed for', row.company_name, e?.message);
            } finally {
              processed++;
              if (processed % 5 === 0) {
                setProgress(`${processed} processed · ${success} ok · ${errors} err`);
              }
            }
          }
        });
        await Promise.all(workers);

        cursor = rows[rows.length - 1].id;
        if (rows.length < CHUNK_SIZE) break; // last page
      }

      toast({
        title: stopRef.current ? 'Bulk Enrichment Stopped' : 'Bulk Enrichment Complete',
        description: `${TIER_LABEL[tier]} · ${success}/${processed} succeeded${errors ? ` · ${errors} errors` : ''}`,
      });
      onComplete?.();
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Bulk Enrichment Failed',
        description: e.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
      setProgress('');
      stopRef.current = false;
    }
  };

  if (running) {
    return (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          stopRef.current = true;
          setProgress('Stopping…');
        }}
      >
        <StopCircle className="h-4 w-4 mr-2" />
        {progress || 'Stop Enrichment'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          Bulk Enrich Companies
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-background">
        <DropdownMenuLabel>Choose enrichment tier</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => run('free')}>
          <div className="flex flex-col">
            <span className="font-medium">Free Tier</span>
            <span className="text-xs text-muted-foreground">Deepseek → Gemini · baseline profiles</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run('standard')}>
          <div className="flex flex-col">
            <span className="font-medium">Standard</span>
            <span className="text-xs text-muted-foreground">+ Apollo firmographics</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run('premium')}>
          <div className="flex flex-col">
            <span className="font-medium">Premium</span>
            <span className="text-xs text-muted-foreground">+ Claude deep reasoning</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
