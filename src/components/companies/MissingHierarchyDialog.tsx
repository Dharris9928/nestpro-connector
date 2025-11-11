import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

interface MissingHierarchyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PotentialConnection {
  childId: string;
  childName: string;
  parentId: string;
  parentName: string;
  reason: string;
}

export function MissingHierarchyDialog({ open, onOpenChange }: MissingHierarchyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const { data: potentialConnections, isLoading } = useQuery({
    queryKey: ['missing-hierarchy-connections'],
    queryFn: async () => {
      // Get all companies without parent relationships
      const { data: orphanCompanies, error: orphanError } = await supabase
        .from('companies')
        .select('id, company_name')
        .is('parent_company_id', null);

      if (orphanError) throw orphanError;

      // Get all companies that could be parents
      const { data: allCompanies, error: allError } = await supabase
        .from('companies')
        .select('id, company_name');

      if (allError) throw allError;

      const connections: PotentialConnection[] = [];

      // Simple pattern matching: look for companies that might be subsidiaries
      orphanCompanies?.forEach((orphan) => {
        allCompanies?.forEach((potential) => {
          if (orphan.id === potential.id) return;

          const orphanLower = orphan.company_name.toLowerCase();
          const potentialLower = potential.company_name.toLowerCase();

          // Pattern 1: Child contains parent name (e.g., "ABC Corp" and "ABC Corp - Northeast")
          if (orphanLower.includes(potentialLower) && orphanLower !== potentialLower) {
            connections.push({
              childId: orphan.id,
              childName: orphan.company_name,
              parentId: potential.id,
              parentName: potential.company_name,
              reason: 'Name contains parent company name',
            });
          }

          // Pattern 2: Look for regional/division indicators
          const regionalIndicators = [' - ', ' division', ' regional', ' inc.', ' llc', ' corp'];
          const hasIndicator = regionalIndicators.some((indicator) => orphanLower.includes(indicator));
          
          if (hasIndicator) {
            const baseName = orphanLower.split(/\s*-\s*/)[0].trim();
            if (potentialLower.includes(baseName) && orphanLower !== potentialLower) {
              connections.push({
                childId: orphan.id,
                childName: orphan.company_name,
                parentId: potential.id,
                parentName: potential.company_name,
                reason: 'Regional/division relationship detected',
              });
            }
          }
        });
      });

      // Remove duplicates
      const uniqueConnections = connections.filter(
        (conn, index, self) =>
          index === self.findIndex((c) => c.childId === conn.childId && c.parentId === conn.parentId)
      );

      return uniqueConnections;
    },
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: async ({ childId, parentId }: { childId: string; parentId: string }) => {
      const { error } = await supabase
        .from('companies')
        .update({ parent_company_id: parentId })
        .eq('id', childId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['missing-hierarchy-connections'] });
      toast({
        title: 'Connection established',
        description: 'Parent-child relationship has been created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to link companies',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleLink = (childId: string, parentId: string) => {
    linkMutation.mutate({ childId, parentId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Missing Hierarchy Connections
          </DialogTitle>
          <DialogDescription>
            Potential parent-child relationships detected by analyzing company names and patterns.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !potentialConnections || potentialConnections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No missing connections detected</p>
            <p className="text-sm text-muted-foreground mt-2">
              All companies appear to have appropriate parent relationships or no relationships are needed.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {potentialConnections.map((connection, index) => (
                <Card key={index} className="border-l-4 border-l-primary/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{connection.childName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pl-6">
                          <span>↳ should be child of</span>
                        </div>
                        <div className="flex items-center gap-2 pl-6">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="font-medium text-primary">{connection.parentName}</span>
                        </div>
                        <div className="pl-6">
                          <Badge variant="secondary" className="text-xs">
                            {connection.reason}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLink(connection.childId, connection.parentId)}
                        disabled={linkMutation.isPending}
                      >
                        {linkMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Link2 className="h-4 w-4" />
                            Link
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
