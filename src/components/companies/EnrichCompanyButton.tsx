import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { EnrichmentConfirmDialog } from './EnrichmentConfirmDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRole } from '@/hooks/useUserRole';

interface EnrichCompanyButtonProps {
  companyId: string;
  onComplete?: () => void;
}

export function EnrichCompanyButton({ companyId, onComplete }: EnrichCompanyButtonProps) {
  const [enriching, setEnriching] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [pendingDeepEnrich, setPendingDeepEnrich] = useState(false);
  const [providers, setProviders] = useState({
    apollo: true,
    gemini: true,
    claude: true,
    deepseek: true,
    perplexity: true,
  });
  const { toast } = useToast();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  
  const canEnrich = userRole?.hasElevatedAccess || false;
  const isDisabled = enriching || !canEnrich || roleLoading;

  const toggleProvider = (provider: keyof typeof providers) => {
    setProviders(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getEnabledProviders = () => {
    return Object.entries(providers)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);
  };

  const handleEnrich = async (deepEnrich: boolean = false) => {
    const enabledProviders = getEnabledProviders();
    
    if (enabledProviders.length === 0) {
      toast({
        title: 'No Providers Selected',
        description: 'Please select at least one enrichment provider.',
        variant: 'destructive'
      });
      return;
    }
    
    setEnriching(true);
    
    try {
      // First, get preview of what would be changed
      const { data: preview, error: previewError } = await supabase.functions.invoke('enrich-company', {
        body: { companyId, deepEnrich, previewOnly: true, providers: enabledProviders }
      });

      if (previewError) throw previewError;

      // If there are fields to overwrite, show confirmation
      if (preview.fieldsToOverwrite && Object.keys(preview.fieldsToOverwrite).length > 0) {
        setPreviewData(preview);
        setPendingDeepEnrich(deepEnrich);
        setShowConfirmDialog(true);
        setEnriching(false);
      } else {
        // No conflicts, proceed directly
        await executeEnrichment(deepEnrich);
      }
    } catch (error) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error.message || 'Failed to enrich company data',
        variant: 'destructive'
      });
      setEnriching(false);
    }
  };

  const executeEnrichment = async (deepEnrich: boolean) => {
    const enabledProviders = getEnabledProviders();
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-company', {
        body: { companyId, deepEnrich, previewOnly: false, providers: enabledProviders }
      });

      if (error) {
        console.error('Enrichment error:', error);
        throw error;
      }

      if (data.error) {
        // Handle detailed error response
        const errorMsg = data.details 
          ? `Enrichment failed:\n${Object.entries(data.details).map(([provider, error]) => `• ${provider}: ${error}`).join('\n')}`
          : data.error;
        
        toast({
          title: 'Enrichment Failed',
          description: errorMsg,
          variant: 'destructive'
        });
        setEnriching(false);
        return;
      }

      const providerName = data.provider === 'lovable_ai' ? 'Gemini AI' : 
                          data.provider === 'claude' ? 'Claude AI' :
                          data.provider === 'deepseek' ? 'Deepseek AI' :
                          data.provider === 'perplexity' ? 'Perplexity' : data.provider;
      
      toast({
        title: deepEnrich ? 'Deep Enrichment Complete' : 'Enrichment Complete',
        description: `${data.fieldsEnriched.length} fields updated${data.apolloEnriched ? ' (including Apollo data)' : ''} using ${providerName}.`,
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error.message || 'Failed to enrich company data',
        variant: 'destructive'
      });
    } finally {
      setEnriching(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDisabled}
                  >
                    <Sparkles className={`h-4 w-4 mr-2 ${enriching ? 'animate-pulse' : ''}`} />
                    {enriching ? 'Enriching...' : 'Enrich Data'}
                  </Button>
                </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="p-3 space-y-3">
            <div className="text-sm font-medium mb-2">Select Providers</div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="apollo" 
                  checked={providers.apollo}
                  onCheckedChange={() => toggleProvider('apollo')}
                />
                <Label htmlFor="apollo" className="text-sm cursor-pointer">
                  Apollo.io (Business Data)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="gemini" 
                  checked={providers.gemini}
                  onCheckedChange={() => toggleProvider('gemini')}
                />
                <Label htmlFor="gemini" className="text-sm cursor-pointer">
                  Gemini AI (Fast)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="claude" 
                  checked={providers.claude}
                  onCheckedChange={() => toggleProvider('claude')}
                />
                <Label htmlFor="claude" className="text-sm cursor-pointer">
                  Claude AI (Advanced)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="deepseek" 
                  checked={providers.deepseek}
                  onCheckedChange={() => toggleProvider('deepseek')}
                />
                <Label htmlFor="deepseek" className="text-sm cursor-pointer">
                  Deepseek AI (Deep Analysis)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="perplexity" 
                  checked={providers.perplexity}
                  onCheckedChange={() => toggleProvider('perplexity')}
                />
                <Label htmlFor="perplexity" className="text-sm cursor-pointer">
                  Perplexity (Research)
                </Label>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleEnrich(false)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Standard Enrichment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEnrich(true)}>
            <Zap className="h-4 w-4 mr-2" />
            Deep Enrichment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
            </div>
          </TooltipTrigger>
          {!canEnrich && !roleLoading && (
            <TooltipContent>
              <p>Enrichment requires Admin or Sales Manager role</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {previewData && (
        <EnrichmentConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={() => executeEnrichment(pendingDeepEnrich)}
          fieldsToOverwrite={previewData.fieldsToOverwrite}
          fieldsEnriched={previewData.fieldsEnriched}
          isConfirming={enriching}
        />
      )}
    </>
  );
}
