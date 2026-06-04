import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronRequest } from "../_shared/cronAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const TIER_PROVIDERS: Record<string, string[]> = {
  free:     ['deepseek', 'gemini'],
  standard: ['deepseek', 'gemini', 'apollo'],
  premium:  ['deepseek', 'gemini', 'apollo', 'claude'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authError = verifyCronRequest(req, corsHeaders);
  if (authError) return authError;

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    // Load settings
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
    // Cap raised from 50 → 200. Users can request up to 200 per tick from settings;
    // larger requests are clamped here to protect enrich-company throughput.
    const batchSize = Math.min(Math.max(settings.batch_size ?? 20, 1), 200);
    const retryDays = settings.retry_after_days ?? 7;
    const providers = TIER_PROVIDERS[tier] ?? TIER_PROVIDERS.free;

    const retryThreshold = new Date(Date.now() - retryDays * 24 * 60 * 60 * 1000).toISOString();

    // Pick next batch: missing BOTH builder_segment (for Builders) and segment (for
    // Contractors/Energy/Engineer/Partner), has at least one enrichable source,
    // and either never attempted OR last attempt older than retryDays.
    // Without the segment-is-null clause, every contractor gets re-picked forever
    // because builder_segment is only written for industry_type = 'Builder'.
    const { data: rows, error } = await supabase
      .from('companies')
      .select('id, company_name, industry_type')
      .is('builder_segment', null)
      .is('segment', null)
      .or(`website_url.not.is.null,linkedin_company_url.not.is.null,primary_email.not.is.null`)
      .or(`last_enrichment_attempt_at.is.null,last_enrichment_attempt_at.lt.${retryThreshold}`)
      .order('last_enrichment_attempt_at', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true })
      .limit(batchSize);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      // Log queue-empty ticks too so the Activity Log shows the cron is alive
      // Include diagnostic counts so the user can see WHY the queue is empty.
      const segmentMissing = (q: any) => q.is('builder_segment', null).is('segment', null);
      const [{ count: missingSegment }, { count: missingWithSource }, { count: attemptedRecently }] = await Promise.all([
        segmentMissing(supabase.from('companies').select('id', { count: 'exact', head: true })),
        segmentMissing(supabase.from('companies').select('id', { count: 'exact', head: true }))
          .or('website_url.not.is.null,linkedin_company_url.not.is.null,primary_email.not.is.null'),
        segmentMissing(supabase.from('companies').select('id', { count: 'exact', head: true }))
          .gte('last_enrichment_attempt_at', retryThreshold),
      ]);
      await supabase.from('enrichment_logs').insert({
        company_id: null,
        provider: 'bulk_cron',
        enrichment_type: 'bulk_summary',
        status: 'no_segment',
        error_message: `Queue empty. ${missingSegment ?? 0} companies missing segment, ${missingWithSource ?? 0} have an enrichable source (website/linkedin/email), ${attemptedRecently ?? 0} were attempted in the last ${retryDays} days and are excluded by retry_after_days. Lower retry_after_days or add source data to unblock.`,
        fields_enriched: {
          queue_empty: true,
          missing_segment: missingSegment ?? 0,
          missing_with_source: missingWithSource ?? 0,
          attempted_within_retry_window: attemptedRecently ?? 0,
          retry_after_days: retryDays,
          tier,
        },
      });
      return new Response(
        JSON.stringify({ processed: 0, message: 'queue empty', missingSegment, missingWithSource, attemptedRecently }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as attempted up front so a stuck/failed batch doesn't get re-picked on the next tick
    const ids = rows.map(r => r.id);
    await supabase
      .from('companies')
      .update({ last_enrichment_attempt_at: new Date().toISOString() })
      .in('id', ids);

    let success = 0;
    let errors = 0;

    // Enrich in parallel (concurrency 4)
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
            console.warn(`Enrich failed for ${row.company_name}: HTTP ${res.status}`);
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
            // Check whether enrichment actually produced a segment. Builders use
            // `builder_segment`; all other industries use the generic `segment` field.
            const { data: c } = await supabase
              .from('companies')
              .select('builder_segment, segment, industry_type')
              .eq('id', row.id)
              .maybeSingle();
            const isBuilder = (c?.industry_type ?? row.industry_type) === 'Builder';
            const effectiveSegment = isBuilder ? c?.builder_segment : c?.segment;
            const gotSegment = !!effectiveSegment;
            await supabase.from('enrichment_logs').insert({
              company_id: row.id,
              provider: 'bulk_cron',
              enrichment_type: 'bulk',
              status: gotSegment ? 'success' : 'no_segment',
              error_message: gotSegment ? null : `enrich-company returned 200 but ${isBuilder ? 'builder_segment' : 'segment'} is still null. Response: ${bodyText?.slice(0, 300)}`,
              fields_enriched: gotSegment ? { [isBuilder ? 'builder_segment' : 'segment']: effectiveSegment } : [],
            });
          }
        } catch (e) {
          errors++;
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`Enrich error for ${row.company_name}:`, msg);
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

    // Always log a batch summary so the cron is visible in the Activity Log
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
