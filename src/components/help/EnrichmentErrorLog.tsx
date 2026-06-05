import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, RefreshCw, Calendar, Building2, User, Sparkles, CheckCircle2, Coins, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { EditCompanyDialog } from '@/components/companies/EditCompanyDialog';

interface EnrichmentLog {
  id: string;
  company_id: string;
  provider: string;
  enrichment_type: string;
  status: string;
  error_message: string | null;
  fields_enriched: any;
  created_at: string;
  created_by: string;
  company_name?: string;
  company_segment?: string | null;
  company_confidence?: number | null;
  user_name?: string;
}

// Estimated token costs per provider (rough estimates)
const PROVIDER_COSTS = {
  'lovable_ai': { tokensPerRequest: 5000, costPer1M: 0.5 },
  'gemini': { tokensPerRequest: 5000, costPer1M: 0.5 },
  'claude': { tokensPerRequest: 6000, costPer1M: 3.0 },
  'deepseek': { tokensPerRequest: 5000, costPer1M: 0.3 },
  'perplexity': { tokensPerRequest: 4000, costPer1M: 1.0 },
  'apollo': { tokensPerRequest: 0, costPer1M: 0 }, // API call, not token-based
};

function estimateCost(provider: string): { tokens: number; cost: string } {
  const providerKey = provider.toLowerCase();
  const config = PROVIDER_COSTS[providerKey as keyof typeof PROVIDER_COSTS] || { tokensPerRequest: 5000, costPer1M: 1.0 };
  
  const tokens = config.tokensPerRequest;
  const cost = (tokens / 1000000) * config.costPer1M;
  
  if (providerKey === 'apollo') {
    return { tokens: 0, cost: '$0.01' }; // Fixed API call cost
  }
  
  return { 
    tokens, 
    cost: cost < 0.01 ? '<$0.01' : `$${cost.toFixed(3)}`
  };
}

export function EnrichmentErrorLog() {
  const [logs, setLogs] = useState<EnrichmentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [recentOnly, setRecentOnly] = useState(false);
  const [openCompanyId, setOpenCompanyId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (roleData) {
        setIsAdmin(true);
        loadLogs();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      // Get all enrichment logs with company information
      const { data, error } = await supabase
        .from('enrichment_logs')
        .select(`
          id,
          company_id,
          provider,
          enrichment_type,
          status,
          error_message,
          fields_enriched,
          created_at,
          created_by,
          companies!inner(company_name, segment, segment_confidence)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(data?.map(log => log.created_by).filter(Boolean) || [])];
      
      // Fetch user names separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim()]) || []
      );

      const formattedLogs = data?.map(log => ({
        ...log,
        company_name: (log.companies as any)?.company_name,
        company_segment: (log.companies as any)?.segment ?? null,
        company_confidence: (log.companies as any)?.segment_confidence ?? null,
        user_name: profilesMap.get(log.created_by) || 'Unknown User'
      })) || [];

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error loading enrichment logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null; // Don't show anything to non-admins
  }

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'lovable_ai':
      case 'gemini':
        return 'bg-blue-500';
      case 'claude':
        return 'bg-purple-500';
      case 'deepseek':
        return 'bg-cyan-500';
      case 'perplexity':
        return 'bg-orange-500';
      case 'apollo':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'lovable_ai':
        return 'Gemini';
      case 'claude':
        return 'Claude';
      case 'deepseek':
        return 'Deepseek';
      case 'perplexity':
        return 'Perplexity';
      case 'apollo':
        return 'Apollo';
      default:
        return provider;
    }
  };

  const successCount = logs.filter(log => log.status === 'success').length;
  const failedCount = logs.filter(log => log.status === 'failed' || log.status === 'error').length;
  const totalEstimatedCost = logs.reduce((sum, log) => {
    const cost = estimateCost(log.provider);
    const numericCost = parseFloat(cost.cost.replace(/[<$]/g, '')) || 0;
    return sum + numericCost;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Enrichment Activity Log</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Complete enrichment history with cost tracking - Admin only
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {logs.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-accent/50 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'success' ? 'all' : 'success')}
              className={`flex items-center gap-2 text-left rounded-md p-2 -m-2 transition-colors hover:bg-background/60 ${statusFilter === 'success' ? 'ring-2 ring-green-500/60 bg-background/60' : ''}`}
            >
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Success {statusFilter === 'success' && '(filtered)'}</div>
                <div className="text-2xl font-bold">{successCount}</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
              className={`flex items-center gap-2 text-left rounded-md p-2 -m-2 transition-colors hover:bg-background/60 ${statusFilter === 'failed' ? 'ring-2 ring-destructive/60 bg-background/60' : ''}`}
            >
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-sm text-muted-foreground">Failed {statusFilter === 'failed' && '(filtered)'}</div>
                <div className="text-2xl font-bold">{failedCount}</div>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Est. Cost</div>
                <div className="text-2xl font-bold">${totalEstimatedCost.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
          <Button
            variant={recentOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRecentOnly(v => !v)}
          >
            Recently Enriched (24h)
          </Button>
          {(statusFilter !== 'all' || recentOnly) && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setRecentOnly(false); }}>
              Clear filters
            </Button>
          )}
        </div>


        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading enrichment logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">No enrichment activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enrichment requests will appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {logs
                .filter(log => {
                  if (statusFilter !== 'all') {
                    const isSuccess = log.status === 'success';
                    if (statusFilter === 'success' ? !isSuccess : isSuccess) return false;
                  }
                  if (recentOnly) {
                    const ageMs = Date.now() - new Date(log.created_at).getTime();
                    if (ageMs > 24 * 60 * 60 * 1000) return false;
                  }
                  return true;
                })
                .map((log) => {
                const costInfo = estimateCost(log.provider);
                const fieldsCount = log.fields_enriched ? 
                  (Array.isArray(log.fields_enriched) ? log.fields_enriched.length : Object.keys(log.fields_enriched).length) 
                  : 0;
                const isSuccess = log.status === 'success';
                
                return (
                  <div
                    key={log.id}
                    className={`border rounded-lg p-4 space-y-3 transition-colors ${
                      isSuccess 
                        ? 'border-border hover:border-primary/50' 
                        : 'border-destructive/50 hover:border-destructive'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        {log.company_id ? (
                          <button
                            type="button"
                            onClick={() => setOpenCompanyId(log.company_id)}
                            className="font-medium truncate text-primary hover:underline text-left"
                          >
                            {log.company_name || 'Unknown Company'}
                          </button>
                        ) : (
                          <span className="font-medium truncate">
                            {log.company_name || 'Unknown Company'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isSuccess ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{log.user_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getProviderBadgeColor(log.provider)}>
                        {getProviderName(log.provider)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {log.enrichment_type}
                      </Badge>
                      {isSuccess && (
                        <Badge variant="secondary" className="text-xs">
                          {fieldsCount} fields enriched
                        </Badge>
                      )}
                      {log.company_segment && (
                        <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                          {log.company_segment}
                        </Badge>
                      )}
                      {typeof log.company_confidence === 'number' && (
                        <Badge variant="outline" className="text-xs">
                          {log.company_confidence}% confidence
                        </Badge>
                      )}
                      <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                        {costInfo.tokens > 0 && (
                          <span>{costInfo.tokens.toLocaleString()} tokens</span>
                        )}
                        <span className="font-medium">{costInfo.cost}</span>
                      </div>
                    </div>

                    {!isSuccess && log.error_message && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                        <p className="text-sm text-destructive font-mono break-words">
                          {log.error_message}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {logs.length > 0 && (
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            <p>Showing {logs.length} most recent enrichment requests (last 100)</p>
          </div>
        )}
      </CardContent>
      {openCompanyId && (
        <EditCompanyDialog
          open={!!openCompanyId}
          companyId={openCompanyId}
          onOpenChange={(o) => { if (!o) setOpenCompanyId(null); }}
          onClose={() => setOpenCompanyId(null)}
          onSuccess={() => { setOpenCompanyId(null); loadLogs(); }}
        />
      )}
    </Card>
  );
}
