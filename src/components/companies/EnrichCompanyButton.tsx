import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { EnrichmentConfirmDialog } from './EnrichmentConfirmDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRole } from '@/hooks/useUserRole';

interface EnrichCompanyButtonProps {
  companyId: string;
  onComplete?: () => void;
}

// Anthropic Claude Sonnet pricing (per company estimate based on ~5k input + 2k output tokens).
const CLAUDE_EST_COST_USD = 0.045;

export function EnrichCompanyButton({ companyId, onComplete }: EnrichCompanyButtonProps) {
  const [enriching, setEnriching] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [pendingDeepEnrich, setPendingDeepEnrich] = useState(false);
  const [providers, setProviders] = useState({
    apollo: true,
    gemini: true,
    claude: false, // OFF by default — paid
  });
  const { toast } = useToast();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  const canEnrich = userRole?.hasElevatedAccess || false;
  const isDisabled = enriching || !canEnrich || roleLoading;

  const toggleProvider = (provider: keyof typeof providers) => {
    setProviders(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getEnabledProviders = () =>
    Object.entries(providers).filter(([_, v]) => v).map(([k]) => k);

  // Wraps handleEnrich with a cost-confirmation gate when Claude or deep-enrich is selected.
  const requestEnrich = (deepEnrich: boolean) => {
    const needsCostConfirm = providers.claude || deepEnrich;
    setPendingDeepEnrich(deepEnrich);
    if (needsCostConfirm) {
      setShowCostDialog(true);
    } else {
      handleEnrich(deepEnrich);
    }
  };

  const handleEnrich = async (deepEnrich: boolean) => {
    const enabledProviders = getEnabledProviders();

    if (enabledProviders.length === 0) {
      toast({
        title: 'No Providers Selected',
        description: 'Please select at least one enrichment provider.',
        variant: 'destructive',
      });
      return;
    }

    setEnriching(true);

    try {
      const { data: preview, error: previewError } = await supabase.functions.invoke('enrich-company', {
        body: { companyId, deepEnrich, previewOnly: true, providers: enabledProviders },
      });

      if (previewError) throw previewError;

      if (preview.fieldsToOverwrite && Object.keys(preview.fieldsToOverwrite).length > 0) {
        setPreviewData(preview);
        setShowConfirmDialog(true);
        setEnriching(false);
      } else {
        await executeEnrichment(deepEnrich);
      }
    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error?.message || 'Failed to enrich company data',
        variant: 'destructive',
        duration: 8000,
      });
      setEnriching(false);
    }
  };

  const executeEnrichment = async (deepEnrich: boolean) => {
    const enabledProviders = getEnabledProviders();
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-company', {
        body: { companyId, deepEnrich, previewOnly: false, providers: enabledProviders },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Enrichment Failed',
          description: data.message || data.error,
          variant: 'destructive',
          duration: 10000,
        });
        if (data.technicalDetails) console.error('Technical error details:', data.technicalDetails);
        setEnriching(false);
        return;
      }

      const providerName =
        data.provider === 'lovable_ai' ? 'Gemini' :
        data.provider === 'claude' ? 'Claude' : data.provider;

      toast({
        title: deepEnrich ? 'Deep Enrichment Complete' : 'Enrichment Complete',
        description: `${data.fieldsEnriched.length} fields updated${data.apolloEnriched ? ' (including Apollo data)' : ''} using ${providerName}.`,
      });

      onComplete?.();
    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error?.message || 'Failed to enrich company data',
        variant: 'destructive',
        duration: 8000,
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
                  <Button variant="outline" size="sm" disabled={isDisabled}>
                    <Sparkles className={`h-4 w-4 mr-2 ${enriching ? 'animate-pulse' : ''}`} />
                    {enriching ? 'Enriching...' : 'Enrich Data'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-background">
                  <div className="p-3 space-y-3">
                    <div className="text-sm font-medium mb-2">Select Providers</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="apollo" checked={providers.apollo} onCheckedChange={() => toggleProvider('apollo')} />
                        <Label htmlFor="apollo" className="text-sm cursor-pointer">
                          Apollo.io <span className="text-muted-foreground">(firmographics)</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="gemini" checked={providers.gemini} onCheckedChange={() => toggleProvider('gemini')} />
                        <Label htmlFor="gemini" className="text-sm cursor-pointer">
                          Gemini <span className="text-muted-foreground">(free, fast)</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="claude" checked={providers.claude} onCheckedChange={() => toggleProvider('claude')} />
                        <Label htmlFor="claude" className="text-sm cursor-pointer">
                          Claude <span className="text-amber-600">(paid · ~${CLAUDE_EST_COST_USD.toFixed(3)}/co.)</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => requestEnrich(false)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Standard Enrichment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => requestEnrich(true)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Deep Enrichment <span className="ml-1 text-xs text-amber-600">(paid)</span>
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

      {/* Cost confirmation for Claude / Deep Enrich */}
      <AlertDialog open={showCostDialog} onOpenChange={setShowCostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Paid Enrichment
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>
                This run will use <strong>Anthropic Claude Sonnet</strong>, which is a paid model
                (separate from your free Gemini usage).
              </div>
              <div className="rounded border p-3 bg-muted/40 text-sm">
                <div>Estimated cost: <strong>~${CLAUDE_EST_COST_USD.toFixed(3)} USD</strong> for this company</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Based on ~5k input + 2k output tokens at Claude Sonnet pricing. Actual cost may vary.
                </div>
              </div>
              <div className="text-sm">Do you want to proceed?</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCostDialog(false);
                handleEnrich(pendingDeepEnrich);
              }}
            >
              Accept charges & continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
