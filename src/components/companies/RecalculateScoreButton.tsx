import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { calculateLeadScore } from '@/lib/scoring/leadScoring';
import { useToast } from '@/hooks/use-toast';

interface RecalculateScoreButtonProps {
  companyId: string;
  onComplete?: () => void;
}

export function RecalculateScoreButton({ 
  companyId, 
  onComplete 
}: RecalculateScoreButtonProps) {
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  const handleRecalculate = async () => {
    setCalculating(true);
    
    try {
      const scoring = await calculateLeadScore(companyId);
      
      toast({
        title: 'Score Updated',
        description: `New score: ${scoring.totalScore}/100 (${scoring.priorityTier})`,
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to calculate score',
        variant: 'destructive'
      });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRecalculate}
      disabled={calculating}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
      {calculating ? 'Calculating...' : 'Recalculate Score'}
    </Button>
  );
}
