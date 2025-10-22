import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, AlertCircle, TrendingUp, Building2, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitGeographicSearchDialog } from "@/components/permits/PermitGeographicSearchDialog";
import { PermitTable } from "@/components/permits/PermitTable";
import { PermitAlertsPanel } from "@/components/permits/PermitAlertsPanel";
import { PermitStats } from "@/components/permits/PermitStats";
import { usePerspective } from "@/hooks/usePerspective";

const BuildingPermits = () => {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [perspective] = useState<'my_records' | 'all_records'>('my_records');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: permits, isLoading, refetch } = useQuery({
    queryKey: ['building-permits', perspective, user?.id],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('building_permits')
        .select(`
          *,
          builder_company:companies(id, company_name, status)
        `)
        .order('filed_date', { ascending: false });

      if (perspective === 'my_records') {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: stats } = useQuery({
    queryKey: ['permit-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { count: totalPermits } = await supabase
        .from('building_permits')
        .select('id', { count: 'exact', head: true });

      const { count: matched } = await supabase
        .from('building_permits')
        .select('id', { count: 'exact', head: true })
        .eq('is_matched_to_company', true);

      const { count: highValue } = await supabase
        .from('building_permits')
        .select('id', { count: 'exact', head: true })
        .eq('is_high_value', true);

      return {
        total: totalPermits || 0,
        matched: matched || 0,
        highValue: highValue || 0
      };
    },
    enabled: !!user
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Building Permit Discovery</h1>
          <p className="text-muted-foreground">
            Find and track large-scale residential development permits across multiple markets
          </p>
        </div>
        <Button onClick={() => setSearchDialogOpen(true)} size="lg">
          <Search className="mr-2 h-4 w-4" />
          Search Permits
        </Button>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Permits</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Matched Companies</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.matched}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0}% match rate
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High-Value Projects</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highValue}</div>
              <p className="text-xs text-muted-foreground">200+ units or $50M+</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {permits ? new Set(permits.map(p => p.state)).size : 0}
              </div>
              <p className="text-xs text-muted-foreground">States covered</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Permits</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {!permits || permits.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Permits Found</CardTitle>
                <CardDescription>
                  Start by searching for building permits in your target markets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Use the "Search Permits" button to discover new residential development opportunities
                    across regions, states, metros, or specific cities.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <PermitTable permits={permits} onRefetch={refetch} />
          )}
        </TabsContent>

        <TabsContent value="alerts">
          <PermitAlertsPanel />
        </TabsContent>

        <TabsContent value="analytics">
          <PermitStats permits={permits || []} />
        </TabsContent>
      </Tabs>

      <PermitGeographicSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSearchComplete={() => {
          refetch();
          setSearchDialogOpen(false);
        }}
      />
    </div>
  );
};

export default BuildingPermits;
