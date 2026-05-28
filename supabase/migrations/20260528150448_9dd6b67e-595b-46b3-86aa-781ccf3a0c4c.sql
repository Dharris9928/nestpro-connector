
-- ============================================================
-- AUTOMATION RULES
-- ============================================================
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  flow_type TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'dry_run' CHECK (mode IN ('live','dry_run','disabled')),
  schedule_cron TEXT NOT NULL,
  schedule_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  safety_limits JSONB NOT NULL DEFAULT '{"max_rows_per_run":500,"max_writes_per_run":500}'::jsonb,
  cost_ceilings JSONB NOT NULL DEFAULT '{"max_runs_per_day":96,"max_ai_calls_per_run":50,"max_ai_calls_per_day":1000}'::jsonb,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  flagged_for_review BOOLEAN NOT NULL DEFAULT false,
  flagged_reason TEXT,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elevated users view automation rules"
  ON public.automation_rules FOR SELECT
  USING (has_elevated_access(auth.uid()));

CREATE POLICY "Admins manage automation rules"
  ON public.automation_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================
-- AUTOMATION RUNS
-- ============================================================
CREATE TABLE public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error','skipped','dry_run')),
  mode TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  rows_scanned INTEGER DEFAULT 0,
  rows_acted_on INTEGER DEFAULT 0,
  notifications_sent INTEGER DEFAULT 0,
  ai_calls_used INTEGER DEFAULT 0,
  dry_run_payload JSONB,
  result_payload JSONB,
  error_message TEXT,
  error_stack TEXT,
  error_category TEXT,
  fix_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  flagged_for_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_runs_rule ON public.automation_runs(rule_id, started_at DESC);
CREATE INDEX idx_automation_runs_status ON public.automation_runs(status, started_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elevated users view runs"
  ON public.automation_runs FOR SELECT
  USING (has_elevated_access(auth.uid()));

-- ============================================================
-- AUTOMATION ACTION LOG (idempotency)
-- ============================================================
CREATE TABLE public.automation_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  dedupe_until TIMESTAMPTZ NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rule_id, dedupe_key)
);

CREATE INDEX idx_automation_action_log_target ON public.automation_action_log(target_table, target_id);
CREATE INDEX idx_automation_action_log_dedupe_until ON public.automation_action_log(dedupe_until);

GRANT SELECT, INSERT, DELETE ON public.automation_action_log TO authenticated;
GRANT ALL ON public.automation_action_log TO service_role;

ALTER TABLE public.automation_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elevated users view action log"
  ON public.automation_action_log FOR SELECT
  USING (has_elevated_access(auth.uid()));

-- ============================================================
-- AI ACTION LOG (assistant actions audit)
-- ============================================================
CREATE TABLE public.ai_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_name TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  payload JSONB,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','executed','rejected','failed')),
  confirmed_by_user BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_action_log_user ON public.ai_action_log(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.ai_action_log TO authenticated;
GRANT ALL ON public.ai_action_log TO service_role;

ALTER TABLE public.ai_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own AI actions"
  ON public.ai_action_log FOR SELECT
  USING (user_id = auth.uid() OR has_elevated_access(auth.uid()));

CREATE POLICY "Users insert own AI actions"
  ON public.ai_action_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own AI actions"
  ON public.ai_action_log FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- EXTEND notification_preferences with automation toggles
-- ============================================================
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS automation_hot_lead BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS automation_stale_opportunity BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS automation_meeting_followup BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS automation_enrichment BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME,
  ADD COLUMN IF NOT EXISTS assistant_sound_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS assistant_widget_enabled BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- updated_at trigger for automation_rules
-- ============================================================
CREATE TRIGGER trg_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED 4 default rules in dry_run mode
-- ============================================================
INSERT INTO public.automation_rules (rule_key, name, description, flow_type, mode, schedule_cron, config)
VALUES
  ('hot_lead_detection',
   'Hot Lead Detection',
   'Every 15 min, find leads scored P1 in the last hour and notify the assigned rep.',
   'hot_lead',
   'dry_run',
   '*/15 * * * *',
   '{"min_score":80,"lookback_minutes":60}'::jsonb),
  ('stale_opportunity_alert',
   'Stale Opportunity Alert',
   'Daily 7am EST, opportunities with no activity in 14 days get an alert to their owner.',
   'stale_opportunity',
   'dry_run',
   '0 7 * * 1-5',
   '{"days_inactive":14}'::jsonb),
  ('meeting_followup',
   'Meeting Follow-up',
   'Every 30 min, find meetings past their scheduled date with no completion and alert the owner.',
   'meeting_followup',
   'dry_run',
   '*/30 * * * *',
   '{}'::jsonb),
  ('enrichment_backfill',
   'Enrichment Backfill',
   'Hourly, enrich top 50 unenriched companies ordered by lead_score.',
   'enrichment_backfill',
   'dry_run',
   '0 * * * *',
   '{"batch_size":50}'::jsonb);
