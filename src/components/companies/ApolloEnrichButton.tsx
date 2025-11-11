import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRole } from '@/hooks/useUserRole';

interface ApolloEnrichButtonProps {
  companyId: string;
  companyName: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  onComplete?: () => void;
}

export function ApolloEnrichButton({ 
  companyId, 
  companyName, 
  websiteUrl, 
  linkedinUrl,
  onComplete 
}: ApolloEnrichButtonProps) {
  const [enriching, setEnriching] = useState(false);
  const { toast } = useToast();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  
  const canEnrich = userRole?.hasElevatedAccess || false;
  const isDisabled = enriching || !canEnrich || roleLoading;

  const handleEnrich = async () => {
    setEnriching(true);
    
    try {
      // Call Apollo enrichment function
      const { data, error } = await supabase.functions.invoke('apollo-enrich', {
        body: { 
          companyName,
          websiteUrl,
          linkedinUrl
        }
      });

      if (error) throw error;

      if (!data.found) {
        toast({
          title: 'Company Not Found',
          description: 'This company was not found in the Apollo database.',
          variant: 'destructive'
        });
        setEnriching(false);
        return;
      }

      // Update company with Apollo data
      const { error: updateError } = await supabase
        .from('companies')
        .update(data.companyUpdates)
        .eq('id', companyId);

      if (updateError) throw updateError;

      let description = `${data.fieldsEnriched.length} business fields updated from Apollo database.`;
      
      if (data.parentCompanyCreated && data.parentCompanyName) {
        description += ` A new parent company "${data.parentCompanyName}" was created and linked. Please review and update its profile.`;
      } else if (data.parentCompanyName && !data.parentCompanyCreated) {
        description += ` Linked to existing parent company "${data.parentCompanyName}".`;
      }

      toast({
        title: 'Apollo Enrichment Complete',
        description,
        duration: data.parentCompanyCreated ? 8000 : 5000,
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Apollo enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error instanceof Error ? error.message : 'Failed to enrich company with Apollo data',
        variant: 'destructive'
      });
      setEnriching(false);
    }
  };


  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnrich}
              disabled={isDisabled}
            >
              <Building2 className={`h-4 w-4 mr-2 ${enriching ? 'animate-pulse' : ''}`} />
              {enriching ? 'Enriching from Apollo...' : 'Enrich with Apollo'}
            </Button>
          </div>
        </TooltipTrigger>
        {!canEnrich && !roleLoading && (
          <TooltipContent>
            <p>Enrichment requires Admin or Sales Manager role</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
