import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { calculateLeadScore } from '@/lib/scoring/leadScoring';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Client-side per-row recalc — useful for small datasets and immediate UI
 * feedback. For full-dataset recalculation use the v2.0 server-side button
 * which goes through the `recalculate-contractor-scores` edge function
 * (also scores builders despite the legacy name).
 */
interface RecalculateAllScoresButtonProps {
  onComplete?: () => void;
}

export function RecalculateAllScoresButton({ onComplete }: RecalculateAllScoresButtonProps) {
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  const handleRecalculateAll = async () => {
    setCalculating(true);
    setProgress({ current: 0, total: 0 });

    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, company_name');

      if (error) throw error;
      if (!companies?.length) {
        toast({ title: 'No Companies', description: 'No companies found to recalculate scores.' });
        return;
      }

      setProgress({ current: 0, total: companies.length });

      let success = 0;
      let failed = 0;
      for (let i = 0; i < companies.length; i++) {
        setProgress({ current: i + 1, total: companies.length });
        try {
          await calculateLeadScore(companies[i].id);
          success++;
        } catch (e) {
          console.error(`Failed for ${companies[i].company_name}:`, e);
          failed++;
        }
      }

      toast({
        title: 'Scores Recalculated',
        description: `Successfully updated ${success} companies${failed > 0 ? `. Failed: ${failed}` : ''}`,
      });
      onComplete?.();
    } catch (error) {
      console.error('Error recalculating scores:', error);
      toast({ title: 'Error', description: 'Failed to recalculate scores', variant: 'destructive' });
    } finally {
      setCalculating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Button variant="default" onClick={handleRecalculateAll} disabled={calculating}>
      <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
      {calculating
        ? `Recalculating... (${progress.current}/${progress.total})`
        : 'Recalculate v2.0 (Client-Side)'}
    </Button>
  );
}
