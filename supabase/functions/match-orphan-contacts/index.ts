// Match orphan contacts (contact.company_id IS NULL) to existing companies
// using email domain and linkedin signals. Writes high-confidence matches
// directly to contacts.company_id and medium-confidence to contact_company_matches.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENERIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'me.com', 'msn.com', 'live.com', 'protonmail.com',
  'mail.com', 'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net',
]);

function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  if (s.includes('@')) return s.split('@').pop() || null;
  try {
    const url = s.startsWith('http') ? new URL(s) : new URL('https://' + s);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return s.replace(/^www\./, '').split('/')[0];
  }
}

function extractLinkedinCompanySlug(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = String(url).toLowerCase().match(/linkedin\.com\/company\/([^\/?#]+)/);
  return m ? m[1].replace(/\/$/, '') : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 500, 2000);
    const dryRun = Boolean(body.dryRun);

    // Fetch orphan contacts (no company)
    const { data: orphans, error: orphanErr } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, linkedin_url, company_id')
      .is('company_id', null)
      .limit(limit);
    if (orphanErr) throw orphanErr;

    // Build company indexes (web domain + linkedin slug)
    const { data: companies, error: coErr } = await supabase
      .from('companies')
      .select('id, company_name, website_url, linkedin_company_url');
    if (coErr) throw coErr;

    const byDomain = new Map<string, { id: string; name: string }>();
    const byLinkedin = new Map<string, { id: string; name: string }>();
    for (const c of companies || []) {
      const d = extractDomain(c.website_url);
      if (d && !GENERIC_DOMAINS.has(d)) byDomain.set(d, { id: c.id, name: c.company_name });
      const slug = extractLinkedinCompanySlug(c.linkedin_company_url);
      if (slug) byLinkedin.set(slug, { id: c.id, name: c.company_name });
    }

    let autoLinked = 0;
    let queued = 0;
    let skipped = 0;
    const autoUpdates: { id: string; company_id: string }[] = [];
    const queueRows: any[] = [];

    for (const ct of orphans || []) {
      const emailDomain = extractDomain(ct.email);
      const liSlug = extractLinkedinCompanySlug(ct.linkedin_url);

      let match: { id: string; name: string } | undefined;
      let method = '';
      let confidence = 0;
      let signal = '';

      if (liSlug && byLinkedin.has(liSlug)) {
        match = byLinkedin.get(liSlug);
        method = 'linkedin_company_slug';
        confidence = 95;
        signal = `linkedin slug: ${liSlug}`;
      } else if (emailDomain && !GENERIC_DOMAINS.has(emailDomain) && byDomain.has(emailDomain)) {
        match = byDomain.get(emailDomain);
        method = 'email_domain_exact';
        confidence = 92;
        signal = `email domain: ${emailDomain}`;
      } else if (emailDomain && GENERIC_DOMAINS.has(emailDomain)) {
        skipped++;
        continue;
      } else {
        skipped++;
        continue;
      }

      if (!match) { skipped++; continue; }

      if (confidence >= 90) {
        autoUpdates.push({ id: ct.id, company_id: match.id });
        autoLinked++;
      } else {
        queueRows.push({
          contact_id: ct.id,
          company_id: match.id,
          match_method: method,
          match_confidence: confidence,
          match_signal: signal,
          status: 'pending',
        });
        queued++;
      }
    }

    if (!dryRun) {
      // Auto-link high confidence
      for (const u of autoUpdates) {
        await supabase.from('contacts').update({ company_id: u.company_id }).eq('id', u.id);
      }
      // Insert review queue rows (ignore conflicts on unique pair)
      if (queueRows.length) {
        await supabase.from('contact_company_matches').upsert(queueRows, {
          onConflict: 'contact_id,company_id',
          ignoreDuplicates: true,
        });
      }
    }

    return new Response(
      JSON.stringify({
        scanned: orphans?.length || 0,
        autoLinked,
        queued,
        skipped,
        dryRun,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
