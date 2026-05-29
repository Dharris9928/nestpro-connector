import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIER_PROVIDERS: Record<string, string[]> = {
  free:     ['deepseek', 'gemini'],
  standard: ['deepseek', 'gemini', 'apollo'],
  premium:  ['deepseek', 'gemini', 'apollo', 'claude'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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
      return new Response(
        JSON.stringify({ skipped: true, reason: 'disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tier = (settings.tier as string) || 'free';
    const batchSize = Math.min(Math.max(settings.batch_size ?? 20, 1), 50);
    const retryDays = settings.retry_after_days ?? 7;
    const providers = TIER_PROVIDERS[tier] ?? TIER_PROVIDERS.free;

    const retryThreshold = new Date(Date.now() - retryDays * 24 * 60 * 60 * 1000).toISOString();

    // Pick next batch: missing builder_segment, has at least one enrichable source,
    // and either never attempted OR last attempt older than retryDays
    const { data: rows, error } = await supabase
      .from('companies')
      .select('id, company_name')
      .is('builder_segment', null)
      .or(`website_url.not.is.null,linkedin_company_url.not.is.null,primary_email.not.is.null`)
      .or(`last_enrichment_attempt_at.is.null,last_enrichment_attempt_at.lt.${retryThreshold}`)
      .order('last_enrichment_attempt_at', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true })
      .limit(batchSize);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'queue empty' }),
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
            // Log failure into enrichment_logs so it appears in the Activity Log
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
