import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Loader2, TrendingUp, Lock, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const TIER_CAPABILITIES: Record<'free' | 'standard' | 'premium', { fields: string[]; estCoverage: number }> = {
  free: {
    fields: ['Company segment', 'Industry classification', 'Builder profile', 'Basic firmographics', 'Website signals'],
    estCoverage: 55,
  },
  standard: {
    fields: ['Apollo firmographics', 'Employee count & growth', 'Annual revenue', 'Tech stack', 'Verified emails & phones', 'Decision-maker contacts'],
    estCoverage: 80,
  },
  premium: {
    fields: ['Claude deep reasoning', 'Strategic buying signals', 'Competitive positioning', 'Project pipeline insights', 'Custom outreach hooks'],
    estCoverage: 95,
  },
};

const TIER_ORDER: Array<'free' | 'standard' | 'premium'> = ['free', 'standard', 'premium'];


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

  // Auto-refresh stats every 15s while cron is enabled
  useEffect(() => {
    if (!settings?.enabled) return;
    const id = setInterval(async () => {
      const s = await loadStats();
      if (s) setStats(s);
    }, 15000);
    return () => clearInterval(id);
  }, [settings?.enabled]);

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
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="Total" value={stats.total} />
              <Stat label="Scored" value={stats.scored} tone="success" />
              <Stat label="Awaiting Enrichment" value={ready} tone="warning" />
              <Stat label="Tried (last 7d)" value={stats.attempted_recent} tone="muted" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Enrichment progress</span>
                <span>
                  {stats.scored.toLocaleString()} / {stats.total.toLocaleString()} ({stats.total ? Math.round((stats.scored / stats.total) * 100) : 0}%)
                </span>
              </div>
              <Progress value={stats.total ? (stats.scored / stats.total) * 100 : 0} />
              {settings.enabled && ready > 0 && (
                <p className="text-xs text-muted-foreground">
                  {ready.toLocaleString()} remaining · processing {settings.batch_size} every 2 min
                </p>
              )}
            </div>
          </>
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
            <Select
              value={String(settings.batch_size)}
              onValueChange={(v) => save({ batch_size: Number(v) })}
              disabled={saving}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="25">25 (light)</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200 (max)</SelectItem>
              </SelectContent>
            </Select>
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

        <TierUpgradeRecommendations currentTier={settings.tier} onUpgrade={(t) => save({ tier: t })} disabled={saving} />


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

function TierUpgradeRecommendations({
  currentTier,
  onUpgrade,
  disabled,
}: {
  currentTier: 'free' | 'standard' | 'premium';
  onUpgrade: (t: 'free' | 'standard' | 'premium') => void;
  disabled?: boolean;
}) {
  const currentIdx = TIER_ORDER.indexOf(currentTier);
  const current = TIER_CAPABILITIES[currentTier];
  const upgrades = TIER_ORDER.slice(currentIdx + 1);

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Enrichment Coverage Recommendations</h4>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium capitalize">{currentTier} tier — current</span>
          <span className="text-muted-foreground">~{current.estCoverage}% data coverage</span>
        </div>
        <Progress value={current.estCoverage} />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {current.fields.map((f) => (
            <Badge key={f} variant="secondary" className="text-xs font-normal">
              <Check className="h-3 w-3 mr-1" /> {f}
            </Badge>
          ))}
        </div>
      </div>

      {upgrades.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          You're on the highest tier — maximum data coverage enabled.
        </p>
      ) : (
        upgrades.map((tier) => {
          const cap = TIER_CAPABILITIES[tier];
          const gain = cap.estCoverage - current.estCoverage;
          const newFields = cap.fields.filter((f) => !current.fields.includes(f));
          return (
            <div key={tier} className="rounded-md border border-dashed bg-background p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium capitalize">{tier} tier</span>
                  <Badge variant="outline" className="text-xs">+{gain}% coverage</Badge>
                </div>
                <Button size="sm" variant="outline" disabled={disabled} onClick={() => onUpgrade(tier)}>
                  Upgrade
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Unlocks {newFields.length} additional data point{newFields.length === 1 ? '' : 's'}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {newFields.map((f) => (
                  <Badge key={f} variant="outline" className="text-xs font-normal border-primary/30 text-primary">
                    + {f}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

