import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Shield, Lock, Calendar, Info } from 'lucide-react';

interface PIIItem {
  id: string;
  table_name: string;
  column_name: string;
  data_type: string;
  pii_category: string;
  is_encrypted: boolean;
  encryption_method: string | null;
  retention_period_days: number | null;
  legal_basis: string | null;
  purpose: string | null;
  can_be_exported: boolean;
  can_be_deleted: boolean;
}

export function PIIInventoryDashboard() {
  const { data: piiItems, isLoading } = useQuery({
    queryKey: ['pii-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pii_inventory')
        .select('*')
        .order('table_name', { ascending: true })
        .order('column_name', { ascending: true });

      if (error) throw error;
      return data as PIIItem[];
    },
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      email: 'bg-blue-500',
      phone: 'bg-green-500',
      address: 'bg-purple-500',
      name: 'bg-yellow-500',
      financial: 'bg-red-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  const getLegalBasisColor = (basis: string | null) => {
    const colors: Record<string, string> = {
      consent: 'default',
      contract: 'secondary',
      legitimate_interest: 'outline',
    };
    return colors[basis || ''] || 'outline';
  };

  const groupedByTable = piiItems?.reduce((acc, item) => {
    if (!acc[item.table_name]) {
      acc[item.table_name] = [];
    }
    acc[item.table_name].push(item);
    return acc;
  }, {} as Record<string, PIIItem[]>);

  const stats = {
    totalFields: piiItems?.length || 0,
    encryptedFields: piiItems?.filter((i) => i.is_encrypted).length || 0,
    tables: Object.keys(groupedByTable || {}).length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <CardTitle>PII Data Mapping</CardTitle>
        </div>
        <CardDescription>
          Inventory of all Personal Identifiable Information (PII) stored in the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold">{stats.totalFields}</div>
            <div className="text-sm text-muted-foreground">PII Fields</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold">{stats.encryptedFields}</div>
            <div className="text-sm text-muted-foreground">Encrypted</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold">{stats.tables}</div>
            <div className="text-sm text-muted-foreground">Tables</div>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This inventory helps maintain GDPR compliance by documenting all personal data,
            its purpose, legal basis, and retention policies.
          </AlertDescription>
        </Alert>

        {/* PII Items by Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByTable || {}).map(([tableName, items]) => (
              <div key={tableName} className="space-y-3">
                <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {tableName}
                  <Badge variant="secondary">{items.length} fields</Badge>
                </h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {item.column_name}
                          </code>
                          <Badge
                            className={getCategoryColor(item.pii_category)}
                          >
                            {item.pii_category}
                          </Badge>
                          {item.is_encrypted && (
                            <Badge variant="default" className="gap-1">
                              <Lock className="h-3 w-3" />
                              {item.encryption_method}
                            </Badge>
                          )}
                          <Badge variant={getLegalBasisColor(item.legal_basis) as any}>
                            {item.legal_basis?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          {item.can_be_exported && (
                            <Badge variant="outline" className="text-xs">
                              Exportable
                            </Badge>
                          )}
                          {item.can_be_deleted && (
                            <Badge variant="outline" className="text-xs">
                              Deletable
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {item.purpose && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Purpose:</strong> {item.purpose}
                        </p>
                      )}
                      
                      {item.retention_period_days && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Retention: {item.retention_period_days} days (~
                          {Math.round(item.retention_period_days / 365)} years)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Compliance Notes:</strong> All PII is protected by Row-Level Security (RLS)
            policies. Encrypted fields use AES-256 encryption. Data retention policies are
            automatically enforced by scheduled cleanup jobs.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
