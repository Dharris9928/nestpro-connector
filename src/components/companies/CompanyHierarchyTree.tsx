import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Building2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HierarchyNode {
  id: string;
  company_name: string;
  parent_company_id: string | null;
  level: number;
  full_path: string;
  path: string[];
}

export function CompanyHierarchyTree() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: hierarchyData, isLoading } = useQuery({
    queryKey: ['company-hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_company_hierarchy');
      if (error) throw error;
      return data as HierarchyNode[];
    },
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!hierarchyData) return;
    const allParentIds = hierarchyData
      .filter((node) => hierarchyData.some((child) => child.parent_company_id === node.id))
      .map((node) => node.id);
    setExpandedNodes(new Set(allParentIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hierarchyData || hierarchyData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No company hierarchies found</p>
        </CardContent>
      </Card>
    );
  }

  // Group by hierarchy roots (level 0)
  const rootNodes = hierarchyData.filter((node) => node.level === 0);
  const getChildren = (parentId: string) =>
    hierarchyData.filter((node) => node.parent_company_id === parentId);
  const hasChildren = (nodeId: string) =>
    hierarchyData.some((node) => node.parent_company_id === nodeId);

  const renderNode = (node: HierarchyNode) => {
    const children = getChildren(node.id);
    const isExpanded = expandedNodes.has(node.id);
    const nodeHasChildren = hasChildren(node.id);

    return (
      <div key={node.id} className="select-none">
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md transition-colors group"
          style={{ paddingLeft: `${node.level * 24 + 12}px` }}
        >
          {nodeHasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleNode(node.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="h-6 w-6" />
          )}
          
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          
          <span className="font-medium text-sm flex-1">{node.company_name}</span>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="outline" className="text-xs">
              Level {node.level}
            </Badge>
            {node.level === 0 && (
              <Badge variant="secondary" className="text-xs">
                Root
              </Badge>
            )}
          </div>
        </div>

        {isExpanded && children.length > 0 && (
          <div className="border-l-2 border-border ml-6">
            {children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Hierarchy
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-1">
            {rootNodes.map((node) => renderNode(node))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
