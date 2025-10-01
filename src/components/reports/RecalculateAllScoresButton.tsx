import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { calculateLeadScore } from '@/lib/scoring/leadScoring';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecalculateAllScoresButtonProps {
  onComplete?: () => void;
}

export function RecalculateAllScoresButton({ 
  onComplete 
}: RecalculateAllScoresButtonProps) {
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  const handleRecalculateAll = async () => {
    setCalculating(true);
    setProgress({ current: 0, total: 0 });
    
    try {
      // Fetch all companies
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, company_name');
      
      if (error) throw error;
      if (!companies || companies.length === 0) {
        toast({
          title: 'No Companies',
          description: 'No companies found to recalculate scores.',
        });
        return;
      }

      setProgress({ current: 0, total: companies.length });

      // Calculate score for each company
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        setProgress({ current: i + 1, total: companies.length });
        
        try {
          await calculateLeadScore(company.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to calculate score for ${company.company_name}:`, error);
          failedCount++;
        }
      }

      toast({
        title: 'Scores Recalculated',
        description: `Successfully updated ${successCount} companies${failedCount > 0 ? `. Failed: ${failedCount}` : ''}`,
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error recalculating scores:', error);
      toast({
        title: 'Error',
        description: 'Failed to recalculate scores',
        variant: 'destructive'
      });
    } finally {
      setCalculating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Button
      variant="default"
      onClick={handleRecalculateAll}
      disabled={calculating}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
      {calculating 
        ? `Recalculating... (${progress.current}/${progress.total})` 
        : 'Recalculate All Scores'}
    </Button>
  );
}
