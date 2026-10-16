import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, AlertCircle, TrendingUp, Building2, MapPin, Filter, Home } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitGeographicSearchDialog } from "@/components/permits/PermitGeographicSearchDialog";
import { PermitTable } from "@/components/permits/PermitTable";
import { PermitAlertsPanel } from "@/components/permits/PermitAlertsPanel";
import { PermitStats } from "@/components/permits/PermitStats";
import { usePerspective } from "@/hooks/usePerspective";
import { summarizePermitUnits } from "@/lib/permits/permitUnits";
import { PermitExportButton } from "@/components/permits/PermitExportButton";

const BuildingPermits = () => {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"permits" | "developments">("permits");
  const [perspective] = useState<'my_records' | 'all_records'>('my_records');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_review' | 'active' | 'final' | 'inactive'>('all');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: permits, isLoading, refetch } = useQuery({
    queryKey: ['building-permits', perspective, statusFilter, user?.id],
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

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
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

  // Totals for what's actually on screen (respects the status filter and perspective)
  const { data: repFirms } = useQuery({
    queryKey: ['permit-rep-firms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_reps')
        .select('id, first_name, last_name, is_firm, covered_states')
        .eq('active', true)
        .order('first_name');
      if (error) throw error;
      return (data ?? []).filter((r: any) => (r.covered_states ?? []).length > 0);
    },
  });

  const [repTab, setRepTab] = useState<string>('all');
  const coveredSet = useMemo(
    () => new Set((repFirms ?? []).flatMap((r: any) => (r.covered_states ?? []).map((s: string) => s.toUpperCase()))),
    [repFirms]
  );
  const repLabel = (r: any) => (r.is_firm ? r.first_name : `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim());

  const listFor = (key: string) => {
    const list = permits ?? [];
    if (key === 'all') return list;
    if (key === 'grey') return list.filter((p: any) => !coveredSet.has((p.state ?? '').toUpperCase()));
    const rep = (repFirms ?? []).find((r: any) => r.id === key);
    const states = new Set((rep?.covered_states ?? []).map((s: string) => s.toUpperCase()));
    return list.filter((p: any) => states.has((p.state ?? '').toUpperCase()));
  };
  const visiblePermits = useMemo(() => listFor(repTab), [repTab, permits, repFirms, coveredSet]);
  const repTabName = repTab === 'all' ? 'All' : repTab === 'grey' ? 'Grey States'
    : repLabel((repFirms ?? []).find((r: any) => r.id === repTab) ?? { first_name: 'Rep' });

  const resultTotals = useMemo(() => {
    const list = visiblePermits;
    return { count: list.length, ...summarizePermitUnits(list) };
  }, [visiblePermits]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Building Permit Discovery</h1>
          <p className="text-muted-foreground">
            Find and track large-scale residential development permits across multiple markets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={() => { setSearchMode("developments"); setSearchDialogOpen(true); }}>
            <Building2 className="mr-2 h-4 w-4" />
            Find Developments
          </Button>
          <Button onClick={() => { setSearchMode("permits"); setSearchDialogOpen(true); }} size="lg">
            <Search className="mr-2 h-4 w-4" />
            Search Permits
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
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
              <CardTitle className="text-sm font-medium">Units in Results</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resultTotals.hasEstimates ? "≈" : ""}{resultTotals.units.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {resultTotals.estimated
                  ? `${resultTotals.estimated} counted from permit details`
                  : `${resultTotals.listed} of ${resultTotals.count} list a unit count`}
              </p>
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <CardTitle className="text-lg">Filters</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {resultTotals.count} permits ·{" "}
                  <span
                    className="font-semibold text-foreground"
                    title={resultTotals.hasEstimates
                      ? "Includes permits where Shovels lists no unit count — a single-family, duplex or ADU filing counts as its homes"
                      : undefined}
                  >
                    {resultTotals.hasEstimates ? "≈" : ""}{resultTotals.units.toLocaleString()} units
                  </span>
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Permit Status</Label>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs value={repTab} onValueChange={setRepTab}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="all">All ({listFor('all').length})</TabsTrigger>
                {(repFirms ?? []).map((r: any) => (
                  <TabsTrigger key={r.id} value={r.id} title={(r.covered_states ?? []).join(', ')}>
                    {repLabel(r)} ({listFor(r.id).length})
                  </TabsTrigger>
                ))}
                <TabsTrigger value="grey">Grey States ({listFor('grey').length})</TabsTrigger>
              </TabsList>
            </Tabs>
            <PermitExportButton permits={visiblePermits} listName={repTabName} />
          </div>

          {visiblePermits.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Permits Found</CardTitle>
                <CardDescription>
                  {permits && permits.length > 0
                    ? `No permits in ${repTabName} yet.`
                    : 'Start by searching for building permits in your target markets'}
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
            <PermitTable permits={visiblePermits} onRefetch={refetch} />
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
        initialMode={searchMode}
        onSearchComplete={() => {
          refetch();
          if (searchMode === "permits") setSearchDialogOpen(false);
        }}
      />
    </div>
  );
};

export default BuildingPermits;
