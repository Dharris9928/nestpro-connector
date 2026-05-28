// ============================================================
// Batch recalculation of v2.0 scores for ALL companies.
// (Edge function name kept for backward-compatibility with the
// existing client button. It now scores every company, not just
// contractors.)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';
import { scoreCompanyV2 } from '../_shared/scoringV2.ts';

const BATCH_SIZE = 500;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Auth + elevated-access check
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: hasAccess } = await supabase.rpc('has_elevated_access', { _user_id: user.id });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Admin or Sales Manager role required.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[recalc-v2] starting batch recalculation');

    const summary = {
      total: 0, success: 0, errors: 0,
      by_channel: { Builder: 0, Contractor: 0, Other: 0 },
      by_tier: { P1: 0, P2: 0, P3: 0, Unscored: 0 },
      errored_companies: [] as { id: string; name: string; error: string }[],
    };

    // Recursive pagination (project standard — bypass Supabase 1000-row limit)
    let from = 0;
    while (true) {
      const { data: page, error: pageErr } = await supabase
        .from('companies')
        .select(`
          *,
          contacts:contacts(id, title)
        `)
        .order('id', { ascending: true })
        .range(from, from + BATCH_SIZE - 1);

      if (pageErr) throw pageErr;
      if (!page || page.length === 0) break;

      for (const company of page) {
        summary.total++;
        try {
          const result = scoreCompanyV2(company);
          const channel: 'Builder' | 'Contractor' | 'Other' =
            company.industry_type === 'Builder' ? 'Builder' :
            company.industry_type === 'Contractor' ? 'Contractor' : 'Other';
          summary.by_channel[channel]++;
          summary.by_tier[result.priority_tier]++;

          const { error: updErr } = await supabase
            .from('companies')
            .update({
              lead_score: Math.round(result.total_score),
              segment_confidence: result.confidence,
              score_breakdown_v2: result as any,
              program_readiness_stage: (result as any).program_readiness_stage ?? null,
              score_calculated_at: new Date().toISOString(),
            } as any)
            .eq('id', company.id);
          if (updErr) throw updErr;
          summary.success++;
        } catch (e: any) {
          summary.errors++;
          if (summary.errored_companies.length < 50) {
            summary.errored_companies.push({
              id: company.id, name: company.company_name, error: String(e?.message ?? e),
            });
          }
          console.error(`[recalc-v2] failed for ${company.company_name}:`, e);
        }
      }

      if (page.length < BATCH_SIZE) break;
      from += BATCH_SIZE;
    }

    console.log(`[recalc-v2] complete — success=${summary.success} errors=${summary.errors}`);

    return new Response(JSON.stringify(summary), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[recalc-v2] fatal:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
