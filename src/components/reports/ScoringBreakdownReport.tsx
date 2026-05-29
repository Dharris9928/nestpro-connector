import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EditCompanyDialog } from '@/components/companies/EditCompanyDialog';

interface CompanyScoring {
  company_id: string;
  company_name: string;
  industry_type: string;
  total_score: number;
  priority_tier: string;
  confidence: string;
  firmographic_total: number;
  digital_total: number;
  contact_total: number;
  // Builder specific
  volume_score?: number;
  price_point_score?: number;
  // Contractor specific
  revenue_score?: number;
  business_model_score?: number;
  // Shared
  geographic_score: number;
  stability_score: number;
  website_quality_score: number;
  social_media_score: number;
  technology_adoption_score: number;
  decision_authority_score: number;
  linkedin_professional_score: number;
}

export function ScoringBreakdownReport() {
  const [scoringData, setScoringData] = useState<CompanyScoring[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCompanyId, setOpenCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetchScoringData();
  }, []);

  const fetchScoringData = async () => {
    try {
      // Fetch builder scoring details
      const { data: builderData, error: builderError } = await supabase
        .from('builder_scoring_details')
        .select(`
          company_id,
          total_score,
          priority_tier,
          confidence,
          firmographic_total,
          digital_total,
          contact_total,
          volume_score,
          price_point_score,
          geographic_score,
          stability_score,
          website_quality_score,
          social_media_score,
          technology_adoption_score,
          decision_authority_score,
          linkedin_professional_score
        `);

      // Fetch contractor scoring details
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractor_scoring_details')
        .select(`
          company_id,
          total_score,
          priority_tier,
          confidence,
          firmographic_total,
          digital_total,
          contact_total,
          volume_score,
          revenue_score,
          geographic_score,
          stability_score,
          business_model_score,
          website_quality_score,
          social_media_score,
          technology_adoption_score,
          decision_authority_score,
          linkedin_professional_score
        `);

      if (builderError || contractorError) {
        console.error('Error fetching scoring data:', builderError || contractorError);
        return;
      }

      // Fetch company names
      const allCompanyIds = [
        ...(builderData?.map(d => d.company_id) || []),
        ...(contractorData?.map(d => d.company_id) || [])
      ];

      const { data: companies } = await supabase
        .from('companies')
        .select('id, company_name, industry_type')
        .in('id', allCompanyIds);

      const companyMap = new Map(companies?.map(c => [c.id, c]) || []);

      // Combine and enrich data
      const combined: CompanyScoring[] = [
        ...(builderData?.map(d => ({
          ...d,
          company_name: companyMap.get(d.company_id)?.company_name || 'Unknown',
          industry_type: 'Builder'
        })) || []),
        ...(contractorData?.map(d => ({
          ...d,
          company_name: companyMap.get(d.company_id)?.company_name || 'Unknown',
          industry_type: 'Contractor'
        })) || [])
      ];

      // Sort by total score descending
      combined.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

      setScoringData(combined);
    } catch (error) {
      console.error('Error fetching scoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (tier: string) => {
    switch (tier) {
      case 'P1': return 'bg-red-500';
      case 'P2': return 'bg-orange-500';
      case 'P3': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scoring Breakdown Report</CardTitle>
          <CardDescription>Loading scoring data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoring Breakdown Report</CardTitle>
        <CardDescription>
          Detailed scoring breakdown for all companies ({scoringData.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scoringData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No scoring data found. Calculate scores for companies to see their breakdown here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead className="text-right">Firmographic</TableHead>
                <TableHead className="text-right">Digital</TableHead>
                <TableHead className="text-right">Contact</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Price/Revenue</TableHead>
                <TableHead className="text-right">Geographic</TableHead>
                <TableHead className="text-right">Stability</TableHead>
                <TableHead className="text-right">Website</TableHead>
                <TableHead className="text-right">Social</TableHead>
                <TableHead className="text-right">Technology</TableHead>
                <TableHead className="text-right">Authority</TableHead>
                <TableHead className="text-right">LinkedIn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoringData.map((company) => (
                <TableRow key={company.company_id}>
                  <TableCell className="font-medium">
                    <Button
                      variant="link"
                      className="p-0 h-auto font-medium text-primary hover:underline"
                      onClick={() => setOpenCompanyId(company.company_id)}
                    >
                      {company.company_name}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{company.industry_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {company.total_score || 0}
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(company.priority_tier)}>
                      {company.priority_tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {company.confidence}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {company.firmographic_total || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.digital_total || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.contact_total || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.volume_score || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.price_point_score || company.revenue_score || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.geographic_score || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.stability_score || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.website_quality_score || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.social_media_score || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.technology_adoption_score || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.decision_authority_score || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.linkedin_professional_score || 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
