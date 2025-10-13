import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";

interface GrowthMetric {
  name: string;
  current: number;
  threshold: number;
  unit: string;
  phase: 4 | 5;
  category: string;
  description: string;
}

export function SecurityGrowthTracker() {
  const { data: metrics, isLoading } = useQuery<GrowthMetric[]>({
    queryKey: ['security-growth-metrics'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sb = supabase as any;
      const q1 = sb.from('profiles').select('*', { count: 'exact', head: true }).then((r: any) => r.count || 0) as Promise<number>;
      const q2 = sb.from('companies').select('*', { count: 'exact', head: true }).then((r: any) => r.count || 0) as Promise<number>;
      const q3 = sb.from('contacts').select('*', { count: 'exact', head: true }).then((r: any) => r.count || 0) as Promise<number>;
      const q4 = sb.from('security_incidents').select('*', { count: 'exact', head: true }).then((r: any) => r.count || 0) as Promise<number>;
      const q5 = sb.from('export_logs').select('record_count').gte('created_at', thirtyDaysAgo).then((r: any) => (r.data ?? []).reduce((sum: number, log: any) => sum + (log.record_count ?? 0), 0)) as Promise<number>;
      const q6 = sb.from('api_audit_log').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo).then((r: any) => r.count || 0) as Promise<number>;
      const q7 = sb.from('bulk_access_alerts').select('*', { count: 'exact', head: true }).eq('status', 'open').then((r: any) => r.count || 0) as Promise<number>;
      const q8 = sb.from('companies').select('state').then((r: any) => {
        const states = (r.data ?? []).map((c: any) => c.state).filter(Boolean);
        return new Set(states).size;
      }) as Promise<number>;

      const [
        userCount,
        companyCount,
        contactCount,
        incidentCount,
        exportVolume,
        apiCallCount,
        bulkAlertCount,
        uniqueStates
      ] = await Promise.all([q1, q2, q3, q4, q5, q6, q7, q8]);
      const growthMetrics: GrowthMetric[] = [
        { name: "Active Users", current: userCount, threshold: 50, unit: "users", phase: 4, category: "Scale", description: "Consider SSO and adaptive MFA at 50+ users" },
        { name: "Total Records", current: companyCount + contactCount, threshold: 10000, unit: "records", phase: 4, category: "Scale", description: "SIEM integration recommended at 10K+ records" },
        { name: "Security Incidents", current: incidentCount, threshold: 1, unit: "incidents", phase: 4, category: "Risk", description: "Anomaly detection after first incident" },
        { name: "Monthly Export Volume", current: exportVolume, threshold: 5000, unit: "records", phase: 4, category: "Activity", description: "High export activity detected" },
        { name: "Monthly API Calls", current: apiCallCount, threshold: 10000, unit: "calls", phase: 4, category: "Activity", description: "Consider advanced API security" },
        { name: "Geographic Presence", current: uniqueStates, threshold: 10, unit: "states", phase: 4, category: "Expansion", description: "Multi-region deployment for 10+ states" },
        { name: "Active Security Alerts", current: bulkAlertCount, threshold: 5, unit: "alerts", phase: 4, category: "Risk", description: "Advanced threat detection needed" },
        { name: "Enterprise Scale", current: userCount, threshold: 200, unit: "users", phase: 5, category: "Enterprise", description: "Zero Trust architecture for 200+ users" },
        { name: "Data Volume", current: companyCount + contactCount, threshold: 100000, unit: "records", phase: 5, category: "Enterprise", description: "Advanced DLP for 100K+ records" }
      ];

      return growthMetrics;
    },
    refetchInterval: 60000
  });

  if (isLoading) return <Card><CardHeader><CardTitle>Security Growth Tracker</CardTitle><CardDescription>Loading...</CardDescription></CardHeader></Card>;

  const phase4Metrics = metrics?.filter(m => m.phase === 4) || [];
  const phase5Metrics = metrics?.filter(m => m.phase === 5) || [];
  const phase4Triggered = phase4Metrics.filter(m => m.current >= m.threshold).length;
  const phase5Triggered = phase5Metrics.filter(m => m.current >= m.threshold).length;
  
  const userCount = metrics?.find(m => m.name === "Active Users")?.current || 0;
  const shouldRecommendPhase4 = phase4Triggered >= 3 && userCount >= 10;
  const shouldRecommendPhase5 = phase5Triggered >= 3 && userCount >= 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Security Growth Tracker</CardTitle>
        <CardDescription>Monitor growth triggers for advanced security phases</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {shouldRecommendPhase4 && <Alert className="border-orange-500"><AlertTriangle className="h-4 w-4" /><AlertDescription><strong>Phase 4 Recommended:</strong> {phase4Triggered} triggers met with {userCount} active users.</AlertDescription></Alert>}
        {shouldRecommendPhase5 && <Alert className="border-red-500"><AlertTriangle className="h-4 w-4" /><AlertDescription><strong>Phase 5 Recommended:</strong> {phase5Triggered} triggers met with {userCount} active users.</AlertDescription></Alert>}
        {phase4Triggered >= 2 && !shouldRecommendPhase4 && userCount < 10 && <Alert><AlertDescription>Some metrics suggest growth, but we recommend Phase 4 once you have 10+ active users and 3+ triggers.</AlertDescription></Alert>}
        
        <div className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Phase 4: Advanced Security</h3><Badge variant={phase4Triggered >= 2 ? "destructive" : "secondary"}>{phase4Triggered}/{phase4Metrics.length} Triggers</Badge></div>
          {phase4Metrics.map((m, i) => {
            const pct = Math.min((m.current / m.threshold) * 100, 100);
            return <div key={i} className="space-y-2 p-4 border rounded-lg"><div className="flex justify-between"><div className="flex-1"><div className="flex gap-2"><span className="font-medium">{m.name}</span>{m.current >= m.threshold && <CheckCircle2 className="h-4 w-4 text-green-600" />}<Badge variant="outline" className="text-xs">{m.category}</Badge></div><p className="text-sm text-muted-foreground">{m.description}</p></div><div className="text-right"><div className="font-mono text-sm">{m.current.toLocaleString()} / {m.threshold.toLocaleString()}</div><div className="text-xs text-muted-foreground">{m.unit}</div></div></div><Progress value={pct} /></div>;
          })}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Phase 5: Enterprise Features</h3><Badge variant={phase5Triggered >= 2 ? "destructive" : "secondary"}>{phase5Triggered}/{phase5Metrics.length} Triggers</Badge></div>
          {phase5Metrics.map((m, i) => {
            const pct = Math.min((m.current / m.threshold) * 100, 100);
            return <div key={i} className="space-y-2 p-4 border rounded-lg"><div className="flex justify-between"><div className="flex-1"><div className="flex gap-2"><span className="font-medium">{m.name}</span>{m.current >= m.threshold && <CheckCircle2 className="h-4 w-4 text-green-600" />}<Badge variant="outline" className="text-xs">{m.category}</Badge></div><p className="text-sm text-muted-foreground">{m.description}</p></div><div className="text-right"><div className="font-mono text-sm">{m.current.toLocaleString()} / {m.threshold.toLocaleString()}</div><div className="text-xs text-muted-foreground">{m.unit}</div></div></div><Progress value={pct} /></div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
