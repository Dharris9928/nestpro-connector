import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronRequest } from "../_shared/cronAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// COST-CONSCIOUS POLICY:
// - Cron / bulk runs use ONLY Google Gemini (free promo window) + optional Apollo.
// - Claude is reserved for manual Deep Enrichment (paid, user-confirmed).
// - Deepseek / Perplexity / OpenAI are NOT used anywhere — all retired.
const TIER_PROVIDERS: Record<string, string[]> = {
  free:     ['gemini'],
  standard: ['gemini', 'apollo'],
  premium:  ['gemini', 'apollo'], // Claude removed from cron — manual only
};

// After this many consecutive no_segment outcomes, the company is permanently
// excluded from cron until a human clears `enrichment_skip_reason`.
const NO_SEGMENT_RETRY_LIMIT = 2;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authError = verifyCronRequest(req, corsHeaders);
  if (authError) return authError;

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data: settings } = await supabase
      .from('bulk_enrichment_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!settings?.enabled) {
      await supabase.from('enrichment_logs').insert({
        company_id: null,
        provider: 'bulk_cron',
        enrichment_type: 'bulk_summary',
        status: 'success',
        error_message: 'Cron tick skipped: bulk enrichment is disabled in settings.',
        fields_enriched: { skipped: true, reason: 'disabled' },
      });
      return new Response(
        JSON.stringify({ skipped: true, reason: 'disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tier = (settings.tier as string) || 'free';
    const batchSize = Math.min(Math.max(settings.batch_size ?? 20, 1), 200);
    const retryDays = settings.retry_after_days ?? 7;
    const providers = TIER_PROVIDERS[tier] ?? TIER_PROVIDERS.free;

    const retryThreshold = new Date(Date.now() - retryDays * 24 * 60 * 60 * 1000).toISOString();

    // Bare-minimum source signal = website. No website → purge candidate, never
    // enriched by cron. Also excludes companies flagged with a skip reason.
    const { data: rows, error } = await supabase
      .from('companies')
      .select('id, company_name, industry_type')
      .is('builder_segment', null)
      .is('segment', null)
      .is('enrichment_skip_reason', null)
      .not('website_url', 'is', null)
      .neq('website_url', '')
      .or(`last_enrichment_attempt_at.is.null,last_enrichment_attempt_at.lt.${retryThreshold}`)
      .order('last_enrichment_attempt_at', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true })
      .limit(batchSize);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      const baseFilter = (q: any) =>
        q.is('builder_segment', null).is('segment', null).is('enrichment_skip_reason', null);
      const [{ count: missingSegment }, { count: missingWithSource }, { count: attemptedRecently }, { count: purgeCandidates }] = await Promise.all([
        baseFilter(supabase.from('companies').select('id', { count: 'exact', head: true })),
        baseFilter(supabase.from('companies').select('id', { count: 'exact', head: true }))
          .not('website_url', 'is', null).neq('website_url', ''),
        baseFilter(supabase.from('companies').select('id', { count: 'exact', head: true }))
          .gte('last_enrichment_attempt_at', retryThreshold),
        supabase.from('companies').select('id', { count: 'exact', head: true })
          .or('website_url.is.null,website_url.eq.'),
      ]);
      await supabase.from('enrichment_logs').insert({
        company_id: null,
        provider: 'bulk_cron',
        enrichment_type: 'bulk_summary',
        status: 'no_segment',
        error_message: `Queue empty. ${missingSegment ?? 0} unscored, ${missingWithSource ?? 0} have a website, ${attemptedRecently ?? 0} tried within ${retryDays}d, ${purgeCandidates ?? 0} have no website (purge candidates).`,
        fields_enriched: {
          queue_empty: true,
          missing_segment: missingSegment ?? 0,
          missing_with_source: missingWithSource ?? 0,
          attempted_within_retry_window: attemptedRecently ?? 0,
          purge_candidates: purgeCandidates ?? 0,
          retry_after_days: retryDays,
          tier,
        },
      });
      return new Response(
        JSON.stringify({ processed: 0, message: 'queue empty', missingSegment, missingWithSource, attemptedRecently, purgeCandidates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ids = rows.map(r => r.id);
    await supabase
      .from('companies')
      .update({ last_enrichment_attempt_at: new Date().toISOString() })
      .in('id', ids);

    let success = 0;
    let errors = 0;

    const concurrency = 4;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= rows.length) return;
        const row = rows[i];
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/enrich-company`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SERVICE_ROLE}`,
              'apikey': SERVICE_ROLE,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ companyId: row.id, providers, deepEnrich: false }),
          });
          const bodyText = await res.text();
          if (!res.ok) {
            errors++;
            await supabase.from('enrichment_logs').insert({
              company_id: row.id,
              provider: 'bulk_cron',
              enrichment_type: 'bulk',
              status: 'failed',
              error_message: `HTTP ${res.status}: ${bodyText?.slice(0, 500) || 'no body'}`,
              fields_enriched: [],
            });
          } else {
            success++;
            const { data: c } = await supabase
              .from('companies')
              .select('builder_segment, segment, industry_type, enrichment_no_segment_count')
              .eq('id', row.id)
              .maybeSingle();
            const isBuilder = (c?.industry_type ?? row.industry_type) === 'Builder';
            const effectiveSegment = isBuilder ? c?.builder_segment : c?.segment;
            const gotSegment = !!effectiveSegment;

            if (gotSegment) {
              // Reset failure counter on success
              if ((c?.enrichment_no_segment_count ?? 0) > 0) {
                await supabase.from('companies')
                  .update({ enrichment_no_segment_count: 0 })
                  .eq('id', row.id);
              }
            } else {
              // Increment failure counter, flag as dead-end after N tries
              const nextCount = (c?.enrichment_no_segment_count ?? 0) + 1;
              const skipReason = nextCount >= NO_SEGMENT_RETRY_LIMIT
                ? `no_signal_after_${nextCount}_attempts`
                : null;
              await supabase.from('companies')
                .update({
                  enrichment_no_segment_count: nextCount,
                  ...(skipReason ? { enrichment_skip_reason: skipReason } : {}),
                })
                .eq('id', row.id);
            }

            await supabase.from('enrichment_logs').insert({
              company_id: row.id,
              provider: 'bulk_cron',
              enrichment_type: 'bulk',
              status: gotSegment ? 'success' : 'no_segment',
              error_message: gotSegment
                ? null
                : `enrich-company returned 200 but ${isBuilder ? 'builder_segment' : 'segment'} is still null.`,
              fields_enriched: gotSegment ? { [isBuilder ? 'builder_segment' : 'segment']: effectiveSegment } : [],
            });
          }
        } catch (e) {
          errors++;
          const msg = e instanceof Error ? e.message : String(e);
          await supabase.from('enrichment_logs').insert({
            company_id: row.id,
            provider: 'bulk_cron',
            enrichment_type: 'bulk',
            status: 'failed',
            error_message: `Network/Runtime: ${msg.slice(0, 500)}`,
            fields_enriched: [],
          });
        }
      }
    });
    await Promise.all(workers);

    await supabase.from('enrichment_logs').insert({
      company_id: null,
      provider: 'bulk_cron',
      enrichment_type: 'bulk_summary',
      status: errors > 0 && success === 0 ? 'failed' : 'success',
      error_message: `Batch: processed=${rows.length}, success=${success}, errors=${errors}, tier=${tier}`,
      fields_enriched: { processed: rows.length, success, errors, tier, batch_size: batchSize },
    });

    return new Response(
      JSON.stringify({ processed: rows.length, success, errors, tier, batch_size: batchSize }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('bulk-enrich-cron error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
