import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EnrichmentConfirmDialog } from './EnrichmentConfirmDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRole } from '@/hooks/useUserRole';

interface SmartEnrichmentRecommendationsProps {
  onEnrichCompany: (companyId: string) => void;
}

export function SmartEnrichmentRecommendations({ onEnrichCompany }: SmartEnrichmentRecommendationsProps) {
  const { toast } = useToast();
  const [enriching, setEnriching] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  
  const canEnrich = userRole?.hasElevatedAccess || false;

  const recommendations = useQuery({
    queryKey: ['enrichment-recommendations'],
    queryFn: async () => {
      // Get companies that haven't been enriched yet or have low data quality
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, company_name, industry_type, priority_tier, lead_score, website_url, primary_phone, primary_email, annual_volume, annual_revenue_range')
        .in('priority_tier', ['P1', 'P2'])
        .order('lead_score', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Check which haven't been enriched
      const { data: enrichedLogs } = await supabase
        .from('enrichment_logs')
        .select('company_id')
        .eq('status', 'success');

      const enrichedIds = new Set(enrichedLogs?.map(log => log.company_id) || []);

      // Score companies for enrichment priority
      const scored = companies?.map(company => {
        const isEnriched = enrichedIds.has(company.id);
        const missingFields = [
          !company.website_url,
          !company.primary_phone,
          !company.primary_email,
          !company.annual_volume && !company.annual_revenue_range
        ].filter(Boolean).length;

        const priorityScore = company.priority_tier === 'P1' ? 3 : 2;
        const missingFieldsScore = missingFields * 2;
        const leadScoreBonus = company.lead_score >= 60 ? 1 : 0;
        const notEnrichedBonus = !isEnriched ? 3 : 0;

        return {
          ...company,
          enrichmentScore: priorityScore + missingFieldsScore + leadScoreBonus + notEnrichedBonus,
          missingFieldsCount: missingFields,
          isEnriched
        };
      }) || [];

      return scored
        .sort((a, b) => b.enrichmentScore - a.enrichmentScore)
        .slice(0, 5);
    }
  });

  const handleEnrich = async (companyId: string) => {
    setEnriching(companyId);
    try {
      // First, get preview of what would be changed
      const { data: preview, error: previewError } = await supabase.functions.invoke('enrich-company', {
        body: { companyId, deepEnrich: false, previewOnly: true }
      });

      if (previewError) throw previewError;

      // If there are fields to overwrite, show confirmation
      if (preview.fieldsToOverwrite && Object.keys(preview.fieldsToOverwrite).length > 0) {
        setPreviewData(preview);
        setPendingCompanyId(companyId);
        setShowConfirmDialog(true);
        setEnriching(null);
      } else {
        // No conflicts, proceed directly
        await executeEnrichment(companyId);
      }
    } catch (error) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error.message || 'Failed to enrich company',
        variant: 'destructive'
      });
      setEnriching(null);
    }
  };

  const executeEnrichment = async (companyId: string) => {
    setEnriching(companyId);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-company', {
        body: { companyId, deepEnrich: false, previewOnly: false }
      });

      if (error) {
        console.error('Enrichment error:', error);
        throw error;
      }

      if (data?.error) {
        const errorMsg = data.details 
          ? `Enrichment failed:\n${Object.entries(data.details).map(([provider, error]) => `• ${provider}: ${error}`).join('\n')}`
          : data.error;
        
        toast({
          title: 'Enrichment Failed',
          description: errorMsg,
          variant: 'destructive'
        });
        setEnriching(null);
        return;
      }

      toast({
        title: 'Enrichment Complete',
        description: `Company data has been enriched${data?.apolloEnriched ? ' (including Apollo business data)' : ''}.`,
      });

      // Refetch recommendations after enrichment
      setTimeout(() => {
        recommendations.refetch();
      }, 2000);

    } catch (error) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error.message || 'Failed to enrich company',
        variant: 'destructive'
      });
    } finally {
      setEnriching(null);
      setShowConfirmDialog(false);
    }
  };

  if (recommendations.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Smart Enrichment Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!recommendations.data || recommendations.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Smart Enrichment Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No high-priority companies need enrichment at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Smart Enrichment Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.data.map((company) => (
              <div 
                key={company.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{company.company_name}</p>
                    <Badge 
                      className={
                        company.priority_tier === 'P1' ? 'bg-priority-p1 text-priority-p1-foreground' :
                        'bg-priority-p2 text-priority-p2-foreground'
                      }
                    >
                      {company.priority_tier}
                    </Badge>
                    {!company.isEnriched && (
                      <Badge variant="outline" className="text-xs">
                        Not Enriched
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Score: {company.lead_score}</span>
                    {company.missingFieldsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {company.missingFieldsCount} fields missing
                      </span>
                    )}
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEnrich(company.id)}
                          disabled={enriching === company.id || !canEnrich || roleLoading}
                        >
                          <Sparkles className={`h-4 w-4 mr-2 ${enriching === company.id ? 'animate-pulse' : ''}`} />
                          {enriching === company.id ? 'Enriching...' : 'Enrich'}
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {previewData && pendingCompanyId && (
        <EnrichmentConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={() => executeEnrichment(pendingCompanyId)}
          fieldsToOverwrite={previewData.fieldsToOverwrite}
          fieldsEnriched={previewData.fieldsEnriched}
          isConfirming={enriching === pendingCompanyId}
        />
      )}
    </>
  );
}
