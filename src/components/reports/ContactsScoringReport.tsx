import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';

interface ContactScore {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  decision_tier: string | null;
  linkedin_url: string | null;
  linkedin_connections: number | null;
  linkedin_activity_score: number | null;
  company_id: string;
  company_name: string;
  authority_score: number;
  linkedin_score: number;
  total_contribution: number;
}

export function ContactsScoringReport() {
  const [contactScores, setContactScores] = useState<ContactScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContactScores();
  }, []);

  const fetchContactScores = async () => {
    try {
      // Fetch all contacts with their company info
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select(`
          id,
          first_name,
          last_name,
          title,
          decision_tier,
          linkedin_url,
          linkedin_connections,
          linkedin_activity_score,
          company_id,
          companies!inner(company_name)
        `)
        .order('first_name');

      if (error) throw error;

      // Calculate scores for each contact
      const scoredContacts = contacts?.map((contact: any) => {
        const authorityScore = calculateAuthorityScore(contact.title);
        const linkedinScore = calculateContactLinkedInScore(contact);
        
        return {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          title: contact.title,
          decision_tier: contact.decision_tier,
          linkedin_url: contact.linkedin_url,
          linkedin_connections: contact.linkedin_connections,
          linkedin_activity_score: contact.linkedin_activity_score,
          company_id: contact.company_id,
          company_name: contact.companies.company_name,
          authority_score: authorityScore,
          linkedin_score: linkedinScore,
          total_contribution: authorityScore + linkedinScore
        };
      }) || [];

      // Sort by total contribution descending
      scoredContacts.sort((a, b) => b.total_contribution - a.total_contribution);

      setContactScores(scoredContacts);
    } catch (error) {
      console.error('Error fetching contact scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAuthorityScore = (title: string | null): number => {
    if (!title) return 0;

    const titleUpper = title.toUpperCase();
    const titleScores: Record<string, number> = {
      'CEO': 10, 'PRESIDENT': 10, 'OWNER': 10, 'FOUNDER': 10,
      'COO': 10, 'CFO': 10, 'CMO': 10, 'CTO': 10,
      'VP': 8, 'VICE PRESIDENT': 8,
      'DIRECTOR': 6,
      'MANAGER': 4
    };

    for (const [keyword, score] of Object.entries(titleScores)) {
      if (titleUpper.includes(keyword)) {
        return score;
      }
    }

    return 0;
  };

  const calculateContactLinkedInScore = (contact: any): number => {
    if (!contact.linkedin_url) return 0;

    let score = 0;

    // Connection count scoring
    if (contact.linkedin_connections) {
      if (contact.linkedin_connections >= 1000) score += 4;
      else if (contact.linkedin_connections >= 500) score += 3;
      else if (contact.linkedin_connections >= 200) score += 2;
      else score += 1;
    }

    // Activity score
    if (contact.linkedin_activity_score) {
      if (contact.linkedin_activity_score >= 80) score += 3;
      else if (contact.linkedin_activity_score >= 50) score += 2;
      else if (contact.linkedin_activity_score >= 20) score += 1;
    }

    return Math.min(score, 10);
  };

  const getDecisionTierColor = (tier: string | null) => {
    switch (tier) {
      case 'Decision Maker': return 'bg-green-500';
      case 'Influencer': return 'bg-blue-500';
      case 'User': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600 font-semibold';
    if (percentage >= 50) return 'text-orange-600 font-semibold';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact Scoring Report</CardTitle>
          <CardDescription>Loading contact data...</CardDescription>
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
        <CardTitle>Contact Scoring Report</CardTitle>
        <CardDescription>
          Individual contact scoring breakdown ({contactScores.length} total contacts)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Contact Name</TableHead>
                <TableHead className="min-w-[150px]">Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Decision Tier</TableHead>
                <TableHead className="text-right">Authority Score</TableHead>
                <TableHead className="text-right">LinkedIn Score</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>LinkedIn</TableHead>
                <TableHead className="text-right">Connections</TableHead>
                <TableHead className="text-right">Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactScores.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    {contact.first_name} {contact.last_name}
                  </TableCell>
                  <TableCell>{contact.company_name}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <span className="text-sm">{contact.title || '—'}</span>
                  </TableCell>
                  <TableCell>
                    {contact.decision_tier ? (
                      <Badge className={getDecisionTierColor(contact.decision_tier)}>
                        {contact.decision_tier}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right ${getScoreColor(contact.authority_score, 10)}`}>
                    {contact.authority_score}/10
                  </TableCell>
                  <TableCell className={`text-right ${getScoreColor(contact.linkedin_score, 10)}`}>
                    {contact.linkedin_score}/10
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {contact.total_contribution}/20
                  </TableCell>
                  <TableCell>
                    {contact.linkedin_url ? (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {contact.linkedin_connections ? (
                      <span className="text-sm">{contact.linkedin_connections.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {contact.linkedin_activity_score ? (
                      <span className="text-sm">{contact.linkedin_activity_score}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
