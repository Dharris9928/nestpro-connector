import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Building2, MapPin, TrendingUp, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface SimilarCompany {
  id: string;
  company_name: string;
  industry_type: string;
  segment: string | null;
  state: string | null;
  city: string | null;
  lead_score: number;
  priority_tier: string | null;
  status: string;
  annual_volume: number | null;
  website_url: string | null;
}

interface SimilarCompaniesTabProps {
  companyId: string;
  currentCompany: {
    industry_type: string;
    segment: string | null;
    state: string | null;
    lead_score: number;
  };
}

export function SimilarCompaniesTab({ companyId, currentCompany }: SimilarCompaniesTabProps) {
  const [similarCompanies, setSimilarCompanies] = useState<SimilarCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSimilarCompanies();
  }, [companyId]);

  const fetchSimilarCompanies = async () => {
    try {
      setLoading(true);

      // Build the query to find similar companies
      let query = supabase
        .from('companies')
        .select(`
          id,
          company_name,
          industry_type,
          segment,
          state,
          city,
          lead_score,
          priority_tier,
          status,
          annual_volume,
          website_url
        `)
        .neq('id', companyId) // Exclude current company
        .eq('industry_type', currentCompany.industry_type)
        .order('lead_score', { ascending: false })
        .limit(10);

      // Add segment filter if available
      if (currentCompany.segment) {
        query = query.eq('segment', currentCompany.segment);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter and score companies by similarity
      const scoredCompanies = (data || []).map((company) => {
        let similarityScore = 0;

        // Same segment (highest weight)
        if (company.segment === currentCompany.segment) similarityScore += 40;

        // Same state
        if (company.state === currentCompany.state) similarityScore += 30;

        // Similar lead score (within 20 points)
        const scoreDiff = Math.abs(company.lead_score - currentCompany.lead_score);
        if (scoreDiff <= 20) similarityScore += 30 - scoreDiff;

        return { ...company, similarityScore };
      });

      // Sort by similarity score and take top results
      const sorted = scoredCompanies
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 8);

      setSimilarCompanies(sorted);
    } catch (error) {
      console.error('Error fetching similar companies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load similar companies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (tier: string | null) => {
    if (tier === 'P1') return 'bg-priority-p1 text-priority-p1-foreground';
    if (tier === 'P2') return 'bg-priority-p2 text-priority-p2-foreground';
    if (tier === 'P3') return 'bg-priority-p3 text-priority-p3-foreground';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Finding similar companies...</p>
      </div>
    );
  }

  if (similarCompanies.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          No similar companies found. Try enriching more companies in this segment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Similar Companies</h3>
          <p className="text-sm text-muted-foreground">
            Companies matching the same industry, segment, and geographic area
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {similarCompanies.length} matches
        </Badge>
      </div>

      <div className="grid gap-4">
        {similarCompanies.map((company) => (
          <Card key={company.id} className="p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold">{company.company_name}</h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {company.industry_type}
                  </Badge>
                  {company.segment && (
                    <Badge variant="outline" className="text-xs">
                      {company.segment}
                    </Badge>
                  )}
                  <Badge className={`text-xs ${getPriorityColor(company.priority_tier)}`}>
                    {company.priority_tier || 'Unscored'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {company.city && company.state && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {company.city}, {company.state}
                      </span>
                    </div>
                  )}
                  {company.lead_score > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Score: {company.lead_score}</span>
                    </div>
                  )}
                  {company.annual_volume && (
                    <div className="text-xs">
                      {company.annual_volume.toLocaleString()}{' '}
                      {company.industry_type === 'Builder' ? 'homes' : 'calls'}/yr
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {company.website_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs"
                    >
                      Visit Site
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
