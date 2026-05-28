import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Loader2 } from 'lucide-react';

interface Settings {
  enabled: boolean;
  tier: 'free' | 'standard' | 'premium';
  batch_size: number;
  retry_after_days: number;
}

interface QueueStats {
  total: number;
  unscored: number;
  attempted_recent: number;
  scored: number;
}

export function BulkEnrichmentSettingsCard() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [{ data: s }, statsRes] = await Promise.all([
      supabase.from('bulk_enrichment_settings').select('*').eq('id', 1).single(),
      loadStats(),
    ]);
    if (s) setSettings(s as Settings);
    if (statsRes) setStats(statsRes);
    setLoading(false);
  };

  const loadStats = async (): Promise<QueueStats | null> => {
    const { count: total } = await supabase.from('companies').select('*', { count: 'exact', head: true });
    const { count: unscored } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .is('builder_segment', null);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: attempted_recent } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .is('builder_segment', null)
      .gte('last_enrichment_attempt_at', sevenDaysAgo);
    return {
      total: total ?? 0,
      unscored: unscored ?? 0,
      attempted_recent: attempted_recent ?? 0,
      scored: (total ?? 0) - (unscored ?? 0),
    };
  };

  useEffect(() => { load(); }, []);

  const save = async (patch: Partial<Settings>) => {
    if (!settings) return;
    setSaving(true);
    const next = { ...settings, ...patch };
    const { error } = await supabase
      .from('bulk_enrichment_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return;
    }
    setSettings(next);
    toast({ title: 'Settings updated', description: patch.enabled === true ? 'Cron will start within 2 minutes' : undefined });
  };

  const runNow = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('bulk-enrich-cron', { body: {} });
    setSaving(false);
    if (error) {
      toast({ title: 'Run failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tick complete', description: JSON.stringify(data) });
      load();
    }
  };

  if (loading || !settings) {
    return <Card><CardContent className="p-6"><Loader2 className="h-4 w-4 animate-spin" /></CardContent></Card>;
  }

  const ready = stats ? stats.unscored - stats.attempted_recent : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Background Enrichment (Cron)
        </CardTitle>
        <CardDescription>
          Automatically enriches companies every 2 minutes while enabled. Skips records attempted in the last {settings.retry_after_days} days
          and requires at least one source signal (website, LinkedIn, or email).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Total" value={stats.total} />
            <Stat label="Scored" value={stats.scored} tone="success" />
            <Stat label="Awaiting Enrichment" value={ready} tone="warning" />
            <Stat label="Tried (last 7d)" value={stats.attempted_recent} tone="muted" />
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Cron Enabled</Label>
            <p className="text-sm text-muted-foreground">
              {settings.enabled
                ? `Running ${settings.batch_size} companies every 2 min (${settings.tier} tier)`
                : 'Paused — toggle on to start background processing'}
            </p>
          </div>
          <Switch checked={settings.enabled} onCheckedChange={(v) => save({ enabled: v })} disabled={saving} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Tier</Label>
            <Select value={settings.tier} onValueChange={(v: any) => save({ tier: v })} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="free">Free (Deepseek → Gemini)</SelectItem>
                <SelectItem value="standard">Standard (+ Apollo)</SelectItem>
                <SelectItem value="premium">Premium (+ Claude)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Batch Size (per 2 min)</Label>
            <Input
              type="number" min={1} max={50}
              value={settings.batch_size}
              onChange={(e) => setSettings({ ...settings, batch_size: Number(e.target.value) })}
              onBlur={() => save({ batch_size: settings.batch_size })}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Retry After (days)</Label>
            <Input
              type="number" min={1} max={90}
              value={settings.retry_after_days}
              onChange={(e) => setSettings({ ...settings, retry_after_days: Number(e.target.value) })}
              onBlur={() => save({ retry_after_days: settings.retry_after_days })}
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {settings.enabled && ready > 0
              ? `ETA: ~${Math.ceil((ready / settings.batch_size) * 2 / 60)} hours to clear queue`
              : ' '}
          </p>
          <Button variant="outline" size="sm" onClick={runNow} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Run One Tick Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' | 'muted' }) {
  const color =
    tone === 'success' ? 'text-green-600' :
    tone === 'warning' ? 'text-amber-600' :
    tone === 'muted' ? 'text-muted-foreground' : 'text-foreground';
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}
