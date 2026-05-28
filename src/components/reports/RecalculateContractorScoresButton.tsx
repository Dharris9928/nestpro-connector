import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RecalculateContractorScoresButtonProps {
  onComplete?: () => void;
}

export function RecalculateContractorScoresButton({ onComplete }: RecalculateContractorScoresButtonProps) {
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState('');
  const { toast } = useToast();

  const handleRecalculateAll = async () => {
    setCalculating(true);
    setProgress('Starting recalculation...');

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recalculate-contractor-scores`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to recalculate scores');
      }

      const results = await response.json();
      const tiers = results.by_tier ?? {};
      const channels = results.by_channel ?? {};

      toast({
        title: 'v2.0 Recalculation Complete',
        description:
          `Scored ${results.success}/${results.total} companies ` +
          `(${channels.Builder ?? 0} builder, ${channels.Contractor ?? 0} contractor). ` +
          `P1:${tiers.P1 ?? 0} · P2:${tiers.P2 ?? 0} · P3:${tiers.P3 ?? 0} · Unscored:${tiers.Unscored ?? 0}` +
          (results.errors > 0 ? ` · ${results.errors} errors` : ''),
      });

      if (onComplete) onComplete();
    } catch (error: any) {
      console.error('Error recalculating v2 scores:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to recalculate v2.0 scores',
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
      setProgress('');
    }
  };

  return (
    <Button onClick={handleRecalculateAll} disabled={calculating} variant="outline" size="sm">
      <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
      {calculating ? progress || 'Recalculating v2.0...' : 'Recalculate v2.0 Scores (All Companies)'}
    </Button>
  );
}
