import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from '../_shared/rateLimiting.ts';
import { enrichWithDeepseek } from "./enrichWithDeepseek.ts";
import { determineSegment } from "./segmentLogic.ts";
import { buildEnrichmentSystemPrompt, V2_STRATEGIC_TOOL_PROPERTIES, extractV2Fields } from "../_shared/enrichmentDirectives.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  companyId: z.string().uuid('Invalid company ID format'),
  deepEnrich: z.boolean().optional().default(false),
  previewOnly: z.boolean().optional().default(false),
  providers: z.array(z.enum(['apollo', 'gemini', 'claude', 'deepseek', 'perplexity'])).optional().default(['apollo', 'gemini', 'claude'])
});

// Normalize various enum-like values to database-accepted values
function normalizeTechAdoption(value: any): string | undefined {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim().toLowerCase();
  const map: Record<string, string> = {
    'laggard': 'Traditional',
    'conservative': 'Late Adopter',
    'mainstream': 'Mainstream',
    'progressive': 'Early Adopter',
    'early adopter': 'Early Adopter',
    'industry leader': 'Industry Leader',
    'traditional': 'Traditional',
    'late adopter': 'Late Adopter',
  };
  return map[v] ?? undefined;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters',
          details: validation.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { companyId, deepEnrich, previewOnly, providers } = validation.data;

    // Create Supabase client with user's auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect service-role calls (cron / bulk runner) and bypass user auth checks
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isServiceRole = serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

    const supabase = isServiceRole
      ? createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey)
      : createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );

    let user: { id: string } | null = null;
    if (isServiceRole) {
      user = { id: '00000000-0000-0000-0000-000000000000' }; // system user for cron
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = authUser;

      // Check rate limit (skip for service-role/cron)
      const rateLimitResponse = await checkRateLimit(supabase, user.id, 'enrich-company');
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    // For audit/log columns with FK to auth.users, use null when running as
    // service-role (cron) — the zero-UUID sentinel violates the FK constraint
    // and silently drops enrichment_logs / company_ai_insights rows.
    const loggedBy: string | null = isServiceRole ? null : user.id;


    // Check company access
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting enrichment for company: ${company.company_name} (${companyId})`);

    let enrichmentResult;
    let provider = 'none';
    const fallbackUsed = false;
    const providerErrors: Record<string, string> = {}; // Track errors from each provider

    // First, try Apollo for accurate business data (if enabled)
    let apolloData = null;
    if (providers.includes('apollo')) {
      try {
        console.log('Attempting Apollo enrichment first for business metrics...');
        const apolloResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/apollo-enrich`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: company.company_name,
          websiteUrl: company.website_url,
          linkedinUrl: company.linkedin_company_url
        })
      });

      if (apolloResponse.ok) {
        const apolloResult = await apolloResponse.json();
        if (apolloResult.found) {
          apolloData = apolloResult;
          console.log(`Apollo found data: ${apolloResult.fieldsEnriched?.length || 0} fields`);
        } else {
          const errorMsg = 'No data found for company';
          console.log(`Apollo: ${errorMsg}`);
          providerErrors.apollo = errorMsg;
        }
      } else {
        const errorText = await apolloResponse.text();
        const errorMsg = `HTTP ${apolloResponse.status}: ${errorText}`;
        console.error(`Apollo error: ${errorMsg}`);
        providerErrors.apollo = errorMsg;
      }
      } catch (error) {
        const errorMsg = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
        console.error('Apollo enrichment failed:', errorMsg);
        if (error instanceof Error && error.stack) {
          console.error('Stack trace:', error.stack);
        }
        providerErrors.apollo = errorMsg;
      }
    }

    // Build list of available AI providers based on user selection
    // Primary: Gemini, Backup: Claude
    const availableProviders = [];
    if (providers.includes('gemini')) availableProviders.push('gemini');
    if (providers.includes('claude')) availableProviders.push('claude');
    if (providers.includes('deepseek')) availableProviders.push('deepseek');
    if (providers.includes('perplexity')) availableProviders.push('perplexity');

    // Try AI providers in order of preference
    for (const providerName of availableProviders) {
      if (enrichmentResult) break; // Already succeeded
      
      try {
        console.log(`Attempting ${providerName} enrichment...`);
        
        if (providerName === 'gemini' && !deepEnrich) {
          provider = 'lovable_ai';
          enrichmentResult = await enrichWithLovableAI(company);
        } else if (providerName === 'claude') {
          provider = 'claude';
          enrichmentResult = await enrichWithClaude(company, deepEnrich);
        } else if (providerName === 'deepseek') {
          provider = 'deepseek';
          enrichmentResult = await enrichWithDeepseek(company, deepEnrich);
        } else if (providerName === 'perplexity') {
          provider = 'perplexity';
          const allMissingFields = [
            'website_url', 'linkedin_company_url', 'primary_phone',
            'total_employees', 'total_employees_range', 'annual_revenue_range',
            'years_in_business', 'city', 'state', 'facebook_url', 'instagram_url',
            'technology_adoption_level', 'online_review_rating'
          ].filter(field => !company[field] || company[field] === '');
          
          const perplexityData = await enrichWithPerplexity(company, allMissingFields);
          if (perplexityData && Object.keys(perplexityData).length > 0) {
            enrichmentResult = {
              companyUpdates: perplexityData,
              fieldsEnriched: Object.keys(perplexityData),
              confidence: 60,
              insights: null
            };
          }
        }
        
        if (enrichmentResult) {
          console.log(`${providerName} enrichment successful`);
          break;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
        console.error(`${providerName} enrichment failed:`, errorMsg);
        if (error instanceof Error && error.stack) {
          console.error(`${providerName} stack trace:`, error.stack);
        }
        providerErrors[providerName] = errorMsg;
      }
    }

    // Helper to create user-friendly error explanations
    const explainError = (provider: string, errorMsg: string): string => {
      const msg = errorMsg.toLowerCase();
      
      // Apollo-specific errors
      if (provider === 'apollo') {
        if (msg.includes('404') || msg.includes('not found')) {
          return '❌ Apollo: Company not found in their database (this is normal - not all companies are in Apollo)';
        }
        if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid') || msg.includes('api key')) {
          return '⚠️ Apollo: API key is missing or invalid. Go to Settings to add or update your APOLLO_API_KEY.';
        }
        if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
          return '⏸️ Apollo: Rate limit exceeded. Please wait a few minutes before trying again.';
        }
        if (msg.includes('500') || msg.includes('503') || msg.includes('504')) {
          return '🔧 Apollo: Their service is having issues. Try again in a few minutes.';
        }
        return `❌ Apollo: ${errorMsg}`;
      }
      
      // Gemini/Lovable AI errors
      if (provider === 'gemini' || provider === 'lovable_ai') {
        if (msg.includes('401') || msg.includes('unauthorized')) {
          return '⚠️ Gemini (Lovable AI): Authentication failed. Your Lovable AI credits may be exhausted. Add credits at Settings → Workspace → Usage, or contact support@lovable.dev.';
        }
        if (msg.includes('429') || msg.includes('rate limit')) {
          return '⏸️ Gemini (Lovable AI): Rate limit exceeded. Please wait a few minutes before trying again.';
        }
        if (msg.includes('402') || msg.includes('payment required') || msg.includes('insufficient credits')) {
          return '💳 Gemini (Lovable AI): Insufficient credits. Add credits at Settings → Workspace → Usage.';
        }
        if (msg.includes('500') || msg.includes('503') || msg.includes('504')) {
          return '🔧 Gemini (Lovable AI): Service temporarily unavailable. Try again in a few minutes.';
        }
        return `❌ Gemini (Lovable AI): ${errorMsg}`;
      }
      
      // Claude/Anthropic errors
      if (provider === 'claude') {
        if (msg.includes('401') || msg.includes('authentication_error') || msg.includes('invalid x-api-key') || msg.includes('invalid api key')) {
          return '⚠️ Claude: API key is missing, invalid, or expired. Update your ANTHROPIC_API_KEY at Settings. Get a new key at console.anthropic.com.';
        }
        if (msg.includes('429') || msg.includes('rate_limit_error')) {
          return '⏸️ Claude: Rate limit exceeded. Wait before trying again, or upgrade your Anthropic plan at console.anthropic.com.';
        }
        if (msg.includes('400') || msg.includes('insufficient_credits') || msg.includes('credit_balance')) {
          return '💳 Claude: Insufficient credits in your Anthropic account. Add credits at console.anthropic.com.';
        }
        if (msg.includes('529') || msg.includes('overloaded')) {
          return '🔧 Claude: Service is overloaded. Try again in a few moments.';
        }
        return `❌ Claude: ${errorMsg}`;
      }
      
      // DeepSeek errors
      if (provider === 'deepseek') {
        if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid') || msg.includes('api key')) {
          return '⚠️ DeepSeek: API key is missing or invalid. Add or update your DEEPSEEK_API_KEY at Settings.';
        }
        if (msg.includes('429') || msg.includes('rate limit')) {
          return '⏸️ DeepSeek: Rate limit exceeded. Please wait before trying again.';
        }
        if (msg.includes('500') || msg.includes('503')) {
          return '🔧 DeepSeek: Service temporarily unavailable. Try again shortly.';
        }
        return `❌ DeepSeek: ${errorMsg}`;
      }
      
      // Perplexity errors
      if (provider === 'perplexity') {
        if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid') || msg.includes('api key')) {
          return '⚠️ Perplexity: API key is missing or invalid. Add or update your PERPLEXITY_API_KEY at Settings.';
        }
        if (msg.includes('429') || msg.includes('rate limit')) {
          return '⏸️ Perplexity: Rate limit exceeded. Wait before trying again.';
        }
        return `❌ Perplexity: ${errorMsg}`;
      }
      
      return `❌ ${provider}: ${errorMsg}`;
    };

    if (!enrichmentResult) {
      // Build user-friendly error message with explanations
      const friendlyErrors: string[] = [];
      for (const [provider, error] of Object.entries(providerErrors)) {
        friendlyErrors.push(explainError(provider, error));
      }
      
      const userMessage = [
        '⚠️ **All enrichment providers failed**\n',
        '**What happened:**',
        ...friendlyErrors,
        '\n**Next steps:**',
        '1. Check your API keys in Settings (look for ⚠️ warnings above)',
        '2. Verify you have sufficient credits/quota for each service',
        '3. Wait a few minutes and try again if you hit rate limits (⏸️)',
        '4. Contact support@lovable.dev if issues persist'
      ].join('\n');
      
      const technicalDetails = Object.entries(providerErrors)
        .map(([provider, error]) => `${provider}: ${error}`)
        .join('; ');
      
      console.error('========================================');
      console.error('ENRICHMENT FAILED - USER-FRIENDLY VIEW:');
      console.error(userMessage);
      console.error('========================================');
      console.error('ENRICHMENT FAILED - TECHNICAL DETAILS:');
      console.error(technicalDetails);
      console.error('========================================');
      
      const { error: logError } = await supabase.from('enrichment_logs').insert({
        company_id: companyId,
        provider: provider || 'none',
        enrichment_type: deepEnrich ? 'deep' : 'standard',
        status: 'failed',
        error_message: technicalDetails,
        fields_enriched: {},
        created_by: loggedBy
      });
      
      if (logError) {
        console.error('Failed to create failure enrichment log:', logError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'All enrichment providers failed',
          message: userMessage,
          technicalDetails: providerErrors
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge Apollo data with AI enrichment (Apollo takes precedence for business metrics)
    if (apolloData && apolloData.companyUpdates) {
      console.log('Merging Apollo business data with AI enrichment...');
      enrichmentResult.companyUpdates = {
        ...enrichmentResult.companyUpdates,
        ...apolloData.companyUpdates  // Apollo data overwrites AI data for business metrics
      };
      enrichmentResult.fieldsEnriched = Array.from(new Set([
        ...enrichmentResult.fieldsEnriched,
        ...apolloData.fieldsEnriched
      ]));
    }

    // Use Perplexity as final fallback to fill remaining blank fields (if enabled)
    if (providers.includes('perplexity') && provider !== 'perplexity') {
      const missingFields = identifyMissingFields(company, enrichmentResult.companyUpdates);
      if (missingFields.length > 0) {
        console.log(`Attempting Perplexity fallback for ${missingFields.length} missing fields:`, missingFields);
        try {
          const perplexityData = await enrichWithPerplexity(company, missingFields);
          if (perplexityData && Object.keys(perplexityData).length > 0) {
            console.log(`Perplexity filled ${Object.keys(perplexityData).length} additional fields`);
            enrichmentResult.companyUpdates = {
              ...enrichmentResult.companyUpdates,
              ...perplexityData
            };
            enrichmentResult.fieldsEnriched = Array.from(new Set([
              ...enrichmentResult.fieldsEnriched,
              ...Object.keys(perplexityData)
            ]));
          }
        } catch (error) {
          console.log('Perplexity fallback failed:', error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }

    // If preview mode, return what would be changed without updating
    if (previewOnly) {
      const fieldsToOverwrite: Record<string, { current: any; new: any }> = {};
      
      for (const [key, newValue] of Object.entries(enrichmentResult.companyUpdates)) {
        const currentValue = company[key];
        if (currentValue !== null && currentValue !== undefined && currentValue !== '' && newValue !== currentValue) {
          fieldsToOverwrite[key] = { current: currentValue, new: newValue };
        }
      }

      return new Response(
        JSON.stringify({
          preview: true,
          provider,
          confidence: enrichmentResult.confidence,
          fieldsEnriched: enrichmentResult.fieldsEnriched,
          fieldsToOverwrite,
          companyUpdates: enrichmentResult.companyUpdates,
          insights: enrichmentResult.insights
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize and sanitize updates (trim strings, fix URLs)
    const sanitize = (obj: Record<string, any>) => {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        if (typeof v === 'string') {
          out[k] = v.trim();
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    const updates = sanitize(enrichmentResult.companyUpdates);

    // Pre-strip enum fields whose AI-supplied value doesn't match the DB check
    // constraint. Without this, every update goes through 9+ retry round-trips
    // and the segment can be stripped collaterally before it ever persists.
    const ENUM_ALLOWLIST: Record<string, string[]> = {
      linkedin_activity_level: ['Very Active','Active','Moderate','Inactive'],
      price_point_category: ['entry_level','move_up','premium','luxury'],
      service_area_type: ['local','metro','regional','multi_state'],
      social_media_presence: ['Strong','Moderate','Minimal','None'],
      total_employees_range: ['500+','250-499','100-249','50-99','25-49','10-24','5-9','1-4'],
      website_quality: ['Professional','Basic','Outdated','None'],
      years_in_business_range: ['30+','20-29','15-19','10-14','6-9','3-5','0-2'],
      average_home_price_range: ['$3M+','$2M-$2.99M','$1.5M-$1.99M','$1M-$1.49M','$800K-$999K','$600K-$799K','$500K-$599K','$400K-$499K','$300K-$399K','$250K-$299K','$200K-$249K','$150K-$199K','<$150K'],
      annual_volume_range: ['10,000+','5,000-9,999','3,000-4,999','2,000-2,999','1,500-1,999','1,000-1,499','1,000+','750-999','500-749','500-999','250-499','100-249','50-99','25-49','10-24','5-9','1-4','<100'],
      annual_revenue_range: ['$100M+','$50M-$99M','$50M+','$25M-$49M','$10M-$24M','$10M+','$6M-$10M','$5M-$9M','$3M-$5.9M','$2M-$4M','$1M-$2.9M','$1M-$1.9M','$500K-$999K','<$500K','<$1M','<$2M'],
      revenue_growth_trend: ['High Growth 20%+','Moderate Growth 10-20%','Stable 0-10%','Declining','Unknown'],
      profitability_level: ['Highly Profitable','Profitable','Break-even','Struggling','Unknown'],
    };
    for (const [field, allowed] of Object.entries(ENUM_ALLOWLIST)) {
      const v = updates[field];
      if (v == null || v === '') { delete updates[field]; continue; }
      if (!allowed.includes(String(v))) {
        console.log(`[enum-sanitize] Dropping ${field}='${v}' (not in allowlist)`);
        delete updates[field];
      }
    }

    
    // Auto-assign segment based on enriched data
    const segmentResult = determineSegment(company, updates);
    let segmentRationale = null;
    if (segmentResult.segment) {
      updates.segment = segmentResult.segment;
      segmentRationale = segmentResult.rationale;
      console.log(`Auto-assigned segment: ${segmentResult.segment} - ${segmentRationale}`);
    }

    // If nothing to update, still log and return success
    if (Object.keys(updates).length === 0) {
      const { error: logError } = await supabase.from('enrichment_logs').insert({
        company_id: companyId,
        provider,
        enrichment_type: deepEnrich ? 'deep' : 'standard',
        status: 'success',
        confidence_score: enrichmentResult.confidence,
        fields_enriched: {},
        created_by: loggedBy
      });
      
      if (logError) {
        console.error('Failed to create enrichment log (no updates):', logError);
      }
      
      return new Response(
        JSON.stringify({ success: true, provider, apolloEnriched: !!apolloData, confidence: enrichmentResult.confidence, fieldsEnriched: [], insights: enrichmentResult.insights, scoreRecalculationTriggered: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Attempt update with graceful degradation for constraint failures
    let persistedRow: any = null;
    const failedFields: string[] = [];
    const tryUpdate = async () => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId)
        .select('*')
        .single();
      return { data, error };
    };

    let { data: updatedCompany, error: updateError } = await tryUpdate();

    // Handle constraint failures by iteratively removing problematic fields
    const maxRetries = Object.keys(updates).length;
    let retryCount = 0;
    
    while (updateError && retryCount < maxRetries) {
      const msg = (updateError as any).message || '';
      console.error(`Update failed (attempt ${retryCount + 1}):`, msg);
      
      // Check if it's a constraint violation
      if (msg.includes('violates check constraint') || (updateError as any).code === '23514') {
        // Extract constraint name if possible
        const constraintMatch = msg.match(/constraint "([^"]+)"/);
        const constraintName = constraintMatch ? constraintMatch[1] : 'unknown';
        console.log(`Constraint violation detected: ${constraintName}`);
        
        // Try to identify and remove the problematic field
        // Common patterns: companies_fieldname_check
        const fieldMatch = constraintName.match(/companies_([^_]+(?:_[^_]+)*)_check/);
        let removedField = false;
        
        if (fieldMatch && fieldMatch[1] in updates) {
          const fieldName = fieldMatch[1];
          console.log(`Removing field '${fieldName}' due to constraint violation`);
          failedFields.push(fieldName);
          delete updates[fieldName];
          removedField = true;
        } else {
          // If we can't identify the field, try removing fields one by one
          const remainingFields = Object.keys(updates).filter(f => !failedFields.includes(f));
          if (remainingFields.length > 0) {
            const fieldToRemove = remainingFields[0];
            console.log(`Cannot identify problematic field, removing '${fieldToRemove}' and retrying`);
            failedFields.push(fieldToRemove);
            delete updates[fieldToRemove];
            removedField = true;
          }
        }
        
        if (!removedField || Object.keys(updates).length === 0) {
          break; // No more fields to remove
        }
        
        // Retry the update
        const retry = await tryUpdate();
        updatedCompany = retry.data;
        updateError = retry.error as any;
        retryCount++;
      } else {
        // Not a constraint violation, break the loop
        break;
      }
    }

    if (updateError) {
      // Log failure with attempted fields
      const attemptedFields: Record<string, any> = {};
      Object.keys(updates).forEach(key => {
        attemptedFields[key] = updates[key];
      });
      
      const { error: logError } = await supabase.from('enrichment_logs').insert({
        company_id: companyId,
        provider,
        enrichment_type: deepEnrich ? 'deep' : 'standard',
        status: 'failed',
        confidence_score: enrichmentResult.confidence,
        fields_enriched: attemptedFields,
        error_message: (updateError as any).message || 'Update failed',
        created_by: loggedBy
      });
      
      if (logError) {
        console.error('Failed to create failure log:', logError);
      }

      return new Response(
        JSON.stringify({ error: 'Update failed', details: (updateError as any).message || 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    persistedRow = updatedCompany;

    // Self-verification: confirm each updated field actually landed; retry stragglers field-by-field.
    const verifyAndHeal = async () => {
      const expectedKeys = Object.keys(updates);
      const missing = expectedKeys.filter((k) => {
        const exp = updates[k];
        const got = persistedRow?.[k];
        // Normalize for comparison (string trim, null-equivalence)
        const normExp = typeof exp === 'string' ? exp.trim() : exp;
        const normGot = typeof got === 'string' ? got.trim() : got;
        return JSON.stringify(normExp) !== JSON.stringify(normGot);
      });
      if (missing.length === 0) return { healed: [] as string[], stillMissing: [] as string[] };

      console.log(`[self-heal] ${missing.length} field(s) did not persist on bulk update — retrying individually:`, missing);
      const healed: string[] = [];
      const stillMissing: string[] = [];
      for (const field of missing) {
        const { data: single, error: singleErr } = await supabase
          .from('companies')
          .update({ [field]: updates[field] })
          .eq('id', companyId)
          .select(field)
          .single();
        if (singleErr) {
          console.log(`[self-heal] '${field}' failed:`, singleErr.message);
          stillMissing.push(field);
          if (!failedFields.includes(field)) failedFields.push(field);
        } else if (single && JSON.stringify(single[field]) === JSON.stringify(updates[field])) {
          healed.push(field);
          persistedRow[field] = single[field];
        } else {
          stillMissing.push(field);
        }
      }
      return { healed, stillMissing };
    };

    const healResult = await verifyAndHeal();
    if (healResult.healed.length) {
      console.log(`[self-heal] recovered ${healResult.healed.length} field(s):`, healResult.healed);
    }



    // Upsert AI insights with proper conflict handling
    const { error: insightsError } = await supabase
      .from('company_ai_insights')
      .upsert({
        company_id: companyId,
        ...enrichmentResult.insights,
        segment_rationale: segmentRationale,
        enriched_by: loggedBy,
        last_enriched_at: new Date().toISOString()
      }, {
        onConflict: 'company_id'
      });

    if (insightsError) {
      console.error('Failed to save insights:', insightsError);
    }

    // Compute persisted fields: keys that exist in updates and changed from original company
    const persistedFields = Object.keys(updates).filter((key) => {
      return company[key] !== persistedRow[key];
    });

    // Store both field names AND values for potential manual re-application
    const enrichedDataWithValues: Record<string, any> = {};
    persistedFields.forEach((field) => {
      enrichedDataWithValues[field] = persistedRow[field];
    });

    // Log enrichment with persisted fields and their values
    const { error: logError } = await supabase.from('enrichment_logs').insert({
      company_id: companyId,
      provider,
      enrichment_type: deepEnrich ? 'deep' : 'standard',
      status: 'success',
      confidence_score: enrichmentResult.confidence,
      fields_enriched: enrichedDataWithValues,
      created_by: loggedBy
    });

    if (logError) {
      console.error('Failed to create enrichment log:', logError);
      console.error('Log data:', {
        company_id: companyId,
        provider,
        enrichment_type: deepEnrich ? 'deep' : 'standard',
        status: 'success',
        confidence_score: enrichmentResult.confidence,
        fields_enriched: enrichedDataWithValues,
        created_by: loggedBy
      });
    } else {
      console.log('Enrichment log created successfully');
    }

    // Trigger score recalculation by updating company timestamp
    await supabase
      .from('companies')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', companyId);

    return new Response(
      JSON.stringify({
        success: true,
        provider,
        apolloEnriched: !!apolloData,
        confidence: enrichmentResult.confidence,
        fieldsEnriched: persistedFields,
        insights: enrichmentResult.insights,
        scoreRecalculationTriggered: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Enrichment error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Identify which critical fields are still missing
function identifyMissingFields(company: any, updates: any): string[] {
  const criticalFields = [
    'website_url',
    'linkedin_company_url',
    'primary_phone',
    'primary_email',
    'total_employees',
    'total_employees_range',
    'annual_revenue_range',
    'years_in_business',
    'city',
    'state',
    'address_line1',
    'zip',
    'owner_name',
    'contractor_specialty',
    'service_area_type',
    'facebook_url',
    'instagram_url',
    'technology_adoption_level',
    'online_review_rating',
    'online_review_count_range',
    'website_quality',
    'social_media_presence',
    'linkedin_followers_range',
    'linkedin_activity_level'
  ];

  const missing: string[] = [];
  
  for (const field of criticalFields) {
    const currentValue = company[field];
    const updatedValue = updates[field];
    
    // Field is missing if it's null/empty in both current company and updates
    if ((!currentValue || currentValue === '') && (!updatedValue || updatedValue === '')) {
      missing.push(field);
    }
  }
  
  return missing;
}

// Use Perplexity to search for specific missing company information
async function enrichWithPerplexity(company: any, missingFields: string[]): Promise<Record<string, any>> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const fieldDescriptions: Record<string, string> = {
    website_url: 'official company website URL',
    linkedin_company_url: 'LinkedIn company page URL',
    primary_phone: 'main business phone number',
    primary_email: 'main business email address',
    total_employees: 'number of employees',
    total_employees_range: 'employee count range (1-5, 6-10, 11-25, 26-50, 51-100, 101-250, 251-500, 500+)',
    annual_revenue_range: 'annual revenue range (<$500K, $500K-$999K, $1M-$2.9M, $3M-$5.9M, $6M-$10M, $10M+)',
    years_in_business: 'years the company has been operating',
    city: 'city where company is headquartered',
    state: 'state where company is headquartered (2-letter code)',
    address_line1: 'street address of company headquarters',
    zip: 'ZIP/postal code of company headquarters',
    owner_name: 'owner or CEO name',
    contractor_specialty: 'primary specialty (HVAC, Plumbing, Electrical, General, etc.)',
    service_area_type: 'service area scope (Local, Regional, Statewide, Multi-State, National)',
    facebook_url: 'Facebook page URL',
    instagram_url: 'Instagram profile URL',
    technology_adoption_level: 'technology adoption level (Traditional, Late Adopter, Mainstream, Early Adopter, Industry Leader)',
    online_review_rating: 'average online review rating (0-5 scale)',
    online_review_count_range: 'number of online reviews (None, <10, 10-24, 25-49, 50-99, 100+)',
    website_quality: 'website quality (None, Poor, Basic, Good, Professional)',
    social_media_presence: 'social media activity level (None, Limited, Moderate, Active, Very Active)',
    linkedin_followers_range: 'LinkedIn followers (No page, <500, 500-1K, 1K-5K, 5K-10K, 10K+)',
    linkedin_activity_level: 'LinkedIn activity level (None, Low, Moderate, Active, Very Active)'
  };

  const searchableFields = missingFields.filter(f => fieldDescriptions[f]);
  if (searchableFields.length === 0) return {};

  const fieldsList = searchableFields.map(f => `- ${f}: ${fieldDescriptions[f]}`).join('\n');

  const prompt = `Find the following missing information about ${company.company_name}${company.industry_type ? `, a ${company.industry_type} company` : ''}${company.website_url ? ` (${company.website_url})` : ''}:

${fieldsList}

Return ONLY factual information you can verify. If you cannot find accurate information for a field, omit it. Be specific and concise.`;

  console.log('Perplexity search prompt:', prompt);

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a business data researcher. Provide only verified, factual information in a structured format. For URLs, provide complete URLs. For phone numbers, use standard format. For location data, be precise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    console.log('No content returned from Perplexity');
    return {};
  }

  console.log('Perplexity response:', content);

  // Parse the response to extract structured data
  const enrichedData: Record<string, any> = {};

  // Helper function to extract URLs
  const extractUrl = (text: string, keywords: string[]): string | null => {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\\s]+([https://]+[^\\s,]+)`, 'i');
      const match = text.match(regex);
      if (match) return match[1].trim();
    }
    return null;
  };

  // Helper function to extract phone
  const extractPhone = (text: string): string | null => {
    const phoneRegex = /(?:phone|tel|contact)[:\s]*(\+?[\d\s\-\(\)]+)/i;
    const match = text.match(phoneRegex);
    if (match) {
      const phone = match[1].replace(/\D/g, '');
      if (phone.length >= 10) return phone;
    }
    return null;
  };

  // Helper function to extract number
  const extractNumber = (text: string, keywords: string[]): number | null => {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\\s]*(\\d+[,\\d]*)`, 'i');
      const match = text.match(regex);
      if (match) {
        return parseInt(match[1].replace(/,/g, ''));
      }
    }
    return null;
  };

  // Extract specific fields
  if (missingFields.includes('website_url')) {
    const url = extractUrl(content, ['website', 'site', 'web']);
    if (url) enrichedData.website_url = url;
  }

  if (missingFields.includes('linkedin_company_url')) {
    const url = extractUrl(content, ['linkedin', 'linkedin.com']);
    if (url && url.includes('linkedin.com')) enrichedData.linkedin_company_url = url;
  }

  if (missingFields.includes('facebook_url')) {
    const url = extractUrl(content, ['facebook', 'facebook.com', 'fb']);
    if (url && url.includes('facebook.com')) enrichedData.facebook_url = url;
  }

  if (missingFields.includes('instagram_url')) {
    const url = extractUrl(content, ['instagram', 'instagram.com']);
    if (url && url.includes('instagram.com')) enrichedData.instagram_url = url;
  }

  if (missingFields.includes('primary_phone')) {
    const phone = extractPhone(content);
    if (phone) enrichedData.primary_phone = phone;
  }

  if (missingFields.includes('total_employees')) {
    const employees = extractNumber(content, ['employees', 'staff', 'team size', 'workforce']);
    if (employees) enrichedData.total_employees = employees;
  }

  if (missingFields.includes('years_in_business')) {
    const years = extractNumber(content, ['years in business', 'established', 'founded', 'since']);
    if (years) {
      const currentYear = new Date().getFullYear();
      enrichedData.years_in_business = years > 1900 ? currentYear - years : years;
    }
  }

  // Extract city and state
  if (missingFields.includes('city') || missingFields.includes('state')) {
    const locationRegex = /(?:location|headquarter|based in|located|address)[:\s]*([A-Za-z\s]+),\s*([A-Z]{2})/i;
    const match = content.match(locationRegex);
    if (match) {
      if (missingFields.includes('city')) enrichedData.city = match[1].trim();
      if (missingFields.includes('state')) enrichedData.state = match[2].trim();
    }
  }

  // Extract street address
  if (missingFields.includes('address_line1')) {
    const addressRegex = /(?:address|located at|headquarters)[:\s]*(\d+[^,\n]+)/i;
    const match = content.match(addressRegex);
    if (match) enrichedData.address_line1 = match[1].trim();
  }

  // Extract ZIP code
  if (missingFields.includes('zip')) {
    const zipRegex = /(?:zip|postal|zip code)[:\s]*(\d{5}(?:-\d{4})?)/i;
    const match = content.match(zipRegex);
    if (match) enrichedData.zip = match[1].trim();
  }

  // Extract owner name
  if (missingFields.includes('owner_name')) {
    const ownerRegex = /(?:owner|ceo|president|founder)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
    const match = content.match(ownerRegex);
    if (match) enrichedData.owner_name = match[1].trim();
  }

  // Extract email
  if (missingFields.includes('primary_email')) {
    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.]+/;
    const match = content.match(emailRegex);
    if (match) enrichedData.primary_email = match[0].trim();
  }

  // Extract rating
  if (missingFields.includes('online_review_rating')) {
    const ratingRegex = /(?:rating|review)[:\s]*([\d.]+)[\s\/]*(?:out of\s*)?5?/i;
    const match = content.match(ratingRegex);
    if (match) {
      const rating = parseFloat(match[1]);
      if (rating >= 0 && rating <= 5) enrichedData.online_review_rating = rating;
    }
  }

  return enrichedData;
}

async function enrichWithLovableAI(company: any) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const prompt = `Analyze this company and provide COMPREHENSIVE enrichment data with PRIORITY on business metrics and digital engagement:

Company Name: ${company.company_name}
Industry: ${company.industry_type}
Website: ${company.website_url || 'Not provided'}
LinkedIn: ${company.linkedin_company_url || 'Not provided'}
Current Data: ${JSON.stringify(company, null, 2)}

CRITICAL PRIORITIES - Fill ALL possible fields:

**BUSINESS METRICS (HIGH PRIORITY):**
1. Company size (total_employees) - exact number if possible
2. Annual revenue range - be specific
3. Years in business - calculate from founding date
4. Annual installation/project volume
5. Average project/home price
6. Price point positioning (economy/mid-market/premium/luxury)
7. Revenue growth trend - assess year-over-year growth
8. Profitability level - estimate profit margins
9. Overall financial health rating

**FINANCIAL STABILITY RUBRIC (BINARY ASSESSMENT - YES/NO):**
10. Revenue Growth Indicators - Check for: expansion, new communities, market entry, new office locations, increased capacity (5 pts if YES)
11. Multiple Active Projects - Check for: multiple active communities/projects running simultaneously (5 pts if YES)
12. Industry Awards/Recognition - Check for: builder awards, national rankings, design awards, certifications (3 pts if YES)
13. Positive Reviews/Reputation - Check for: BBB A- or higher, OR 4+ stars average, OR strong testimonials (2 pts if YES)

**DIGITAL ENGAGEMENT (HIGH PRIORITY):**
1. Website quality and professionalism level
2. Website content about smart home/technology
3. LinkedIn company page followers and activity
4. Facebook, Instagram, YouTube presence
5. Social media activity level across platforms
6. Technology adoption indicators
7. Google Business Profile existence
8. Online review presence and ratings

**ADDITIONAL DATA:**
- Geographic market coverage
- Business model and service types
- Competitive positioning
- Growth indicators

Research the company thoroughly using the website and LinkedIn URLs provided. Be comprehensive and prioritize filling business and digital fields.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: buildEnrichmentSystemPrompt(company.industry_type) },
        { role: 'user', content: prompt }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'enrich_company_data',
          description: 'Structure comprehensive enriched company data with focus on business metrics and digital engagement',
          parameters: {
            type: 'object',
            properties: {
              // Business Metrics
              total_employees: { type: 'integer', description: 'Exact number of employees' },
              total_employees_range: { type: 'string', enum: ['1-5', '6-10', '11-25', '26-50', '51-100', '101-250', '251-500', '500+'] },
              annual_revenue_range: { type: 'string', enum: ['<$500K', '$500K-$999K', '$1M-$2.9M', '$3M-$5.9M', '$6M-$10M', '$10M+'] },
              years_in_business: { type: 'integer', description: 'Years company has been operating' },
              years_in_business_range: { type: 'string', enum: ['<5', '5-10', '11-20', '21-30', '30+'] },
              annual_volume: { type: 'integer', description: 'Annual installation/project volume' },
              annual_volume_range: { type: 'string', enum: ['<100', '100-249', '250-499', '500-749', '750-999', '1,000-1,499', '1,500-1,999', '2,000-2,999', '3,000-4,999', '5,000-9,999', '10,000+'] },
              average_home_price: { type: 'integer', description: 'Average project/home price in dollars' },
              average_home_price_range: { type: 'string', enum: ['<$150K', '$150K-$199K', '$200K-$249K', '$250K-$299K', '$300K-$399K', '$400K-$499K', '$500K-$599K', '$600K-$799K', '$800K-$999K', '$1M-$1.49M', '$1.5M-$1.99M', '$2M-$2.99M', '$3M+'] },
              price_point_category: { type: 'string', enum: ['economy', 'mid-market', 'premium', 'luxury'] },
              
              // Financial Stability Indicators
              revenue_growth_trend: { type: 'string', enum: ['Rapid Growth (>20% YoY)', 'Strong Growth (10-20% YoY)', 'Moderate Growth (5-10% YoY)', 'Stable (0-5% YoY)', 'Declining (<0% YoY)', 'Unknown'] },
              profitability_level: { type: 'string', enum: ['Highly Profitable (>15% margin)', 'Profitable (8-15% margin)', 'Moderately Profitable (5-8% margin)', 'Break-even (0-5% margin)', 'Unprofitable (<0% margin)', 'Unknown'] },
              financial_health_rating: { type: 'string', enum: ['Excellent', 'Good', 'Fair', 'Poor', 'At Risk', 'Unknown'] },
              
              // Financial Stability Rubric (Binary YES/NO assessments)
              revenue_growth_indicators: { type: 'boolean', description: 'Evidence of expansion, new markets, increased capacity' },
              multiple_active_projects: { type: 'boolean', description: 'Multiple active communities/projects simultaneously' },
              industry_awards_recognition: { type: 'boolean', description: 'Has received industry awards or recognition' },
              positive_reviews_reputation: { type: 'boolean', description: 'BBB A- or higher, OR 4+ stars, OR strong testimonials' },
              
              // Digital Engagement
              website_url: { type: 'string', description: 'Company website if found' },
              website_quality: { type: 'string', enum: ['None', 'Poor', 'Basic', 'Good', 'Professional'] },
              website_has_smart_home_content: { type: 'boolean', description: 'Does website mention smart home/technology' },
              website_last_updated: { type: 'string', enum: ['Recently', 'Within 6 months', 'Within 1 year', 'Over 1 year', 'Unknown'] },
              
              linkedin_company_url: { type: 'string', description: 'LinkedIn company page URL if found' },
              linkedin_followers_range: { type: 'string', enum: ['No page', '<500', '500-1K', '1K-5K', '5K-10K', '10K+'] },
              linkedin_activity_level: { type: 'string', enum: ['None', 'Low', 'Moderate', 'Active', 'Very Active'] },
              
              facebook_url: { type: 'string', description: 'Facebook page URL if found' },
              instagram_url: { type: 'string', description: 'Instagram profile URL if found' },
              youtube_url: { type: 'string', description: 'YouTube channel URL if found' },
              social_media_presence: { type: 'string', enum: ['None', 'Limited', 'Moderate', 'Active', 'Very Active'] },
              
              technology_adoption_level: { type: 'string', enum: ['Traditional', 'Late Adopter', 'Mainstream', 'Early Adopter', 'Industry Leader'] },
              has_google_business_profile: { type: 'boolean', description: 'Company has Google Business Profile' },
              online_review_rating: { type: 'number', description: 'Average online review rating (0-5)' },
              online_review_count_range: { type: 'string', enum: ['None', '<10', '10-24', '25-49', '50-99', '100+'] },
              
              // Location & Contact
              city: { type: 'string', description: 'City where company is headquartered' },
              state: { type: 'string', description: 'State abbreviation (2-letter code, e.g. TX, CA)' },
              address_line1: { type: 'string', description: 'Street address of headquarters' },
              zip: { type: 'string', description: 'ZIP/postal code' },
              owner_name: { type: 'string', description: 'Owner or CEO name' },
              primary_phone: { type: 'string', description: 'Main business phone number' },
              primary_email: { type: 'string', description: 'Main business email address' },
              contractor_specialty: { type: 'string', enum: ['HVAC', 'Plumbing', 'Electrical', 'General', 'Mechanical', 'Solar', 'Roofing'], description: 'Primary contractor specialty' },
              service_area_type: { type: 'string', enum: ['Local', 'Regional', 'Statewide', 'Multi-State', 'National'], description: 'Geographic service coverage' },
              // AI Insights
              market_positioning: { type: 'string', description: 'How company positions itself in market' },
              competitive_advantages: { type: 'array', items: { type: 'string' } },
              growth_indicators: { type: 'array', items: { type: 'string' } },
              smart_home_readiness_score: { type: 'integer', minimum: 0, maximum: 100 },
              recommended_approach: { type: 'string', description: 'Recommended sales approach' },
              confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] },
              ...V2_STRATEGIC_TOOL_PROPERTIES,
            }
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'enrich_company_data' } }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const toolCall = data.choices[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    throw new Error('No structured data returned from Lovable AI');
  }

  const enrichedData = JSON.parse(toolCall.function.arguments);

  // Build company updates - only include fields that have values
  const companyUpdates: any = {};
  
  // Business metrics
  if (enrichedData.total_employees) companyUpdates.total_employees = enrichedData.total_employees;
  if (enrichedData.total_employees_range) companyUpdates.total_employees_range = enrichedData.total_employees_range;
  if (enrichedData.annual_revenue_range) companyUpdates.annual_revenue_range = enrichedData.annual_revenue_range;
  if (enrichedData.years_in_business) companyUpdates.years_in_business = enrichedData.years_in_business;
  if (enrichedData.years_in_business_range) companyUpdates.years_in_business_range = enrichedData.years_in_business_range;
  if (enrichedData.annual_volume) companyUpdates.annual_volume = enrichedData.annual_volume;
  if (enrichedData.annual_volume_range) companyUpdates.annual_volume_range = enrichedData.annual_volume_range;
  if (enrichedData.average_home_price) companyUpdates.average_home_price = enrichedData.average_home_price;
  if (enrichedData.average_home_price_range) companyUpdates.average_home_price_range = enrichedData.average_home_price_range;
  if (enrichedData.price_point_category) companyUpdates.price_point_category = enrichedData.price_point_category;
  
  // Financial stability indicators
  if (enrichedData.revenue_growth_trend && enrichedData.revenue_growth_trend !== 'Unknown') companyUpdates.revenue_growth_trend = enrichedData.revenue_growth_trend;
  if (enrichedData.profitability_level && enrichedData.profitability_level !== 'Unknown') companyUpdates.profitability_level = enrichedData.profitability_level;
  if (enrichedData.financial_health_rating && enrichedData.financial_health_rating !== 'Unknown') companyUpdates.financial_health_rating = enrichedData.financial_health_rating;
  
  // Financial Stability Rubric (Binary)
  if (enrichedData.revenue_growth_indicators !== undefined) companyUpdates.revenue_growth_indicators = enrichedData.revenue_growth_indicators;
  if (enrichedData.multiple_active_projects !== undefined) companyUpdates.multiple_active_projects = enrichedData.multiple_active_projects;
  if (enrichedData.industry_awards_recognition !== undefined) companyUpdates.industry_awards_recognition = enrichedData.industry_awards_recognition;
  if (enrichedData.positive_reviews_reputation !== undefined) companyUpdates.positive_reviews_reputation = enrichedData.positive_reviews_reputation;
  
  // Digital engagement
  if (enrichedData.website_url) companyUpdates.website_url = enrichedData.website_url;
  if (enrichedData.website_quality) companyUpdates.website_quality = enrichedData.website_quality;
  if (enrichedData.website_has_smart_home_content !== undefined) companyUpdates.website_has_smart_home_content = enrichedData.website_has_smart_home_content;
  if (enrichedData.website_last_updated) companyUpdates.website_last_updated = enrichedData.website_last_updated;
  
  if (enrichedData.linkedin_company_url) companyUpdates.linkedin_company_url = enrichedData.linkedin_company_url;
  if (enrichedData.linkedin_followers_range) companyUpdates.linkedin_followers_range = enrichedData.linkedin_followers_range;
  if (enrichedData.linkedin_activity_level) companyUpdates.linkedin_activity_level = enrichedData.linkedin_activity_level;
  
  if (enrichedData.facebook_url) companyUpdates.facebook_url = enrichedData.facebook_url;
  if (enrichedData.instagram_url) companyUpdates.instagram_url = enrichedData.instagram_url;
  if (enrichedData.youtube_url) companyUpdates.youtube_url = enrichedData.youtube_url;
  if (enrichedData.social_media_presence) companyUpdates.social_media_presence = enrichedData.social_media_presence;
  
  if (enrichedData.technology_adoption_level) {
    const tech = normalizeTechAdoption(enrichedData.technology_adoption_level);
    if (tech) companyUpdates.technology_adoption_level = tech;
  }
  if (enrichedData.has_google_business_profile !== undefined) companyUpdates.has_google_business_profile = enrichedData.has_google_business_profile;
  if (enrichedData.online_review_rating) companyUpdates.online_review_rating = enrichedData.online_review_rating;
  if (enrichedData.online_review_count_range) companyUpdates.online_review_count_range = enrichedData.online_review_count_range;

  // Location & Contact
  if (enrichedData.city) companyUpdates.city = enrichedData.city;
  if (enrichedData.state) companyUpdates.state = enrichedData.state;
  if (enrichedData.address_line1) companyUpdates.address_line1 = enrichedData.address_line1;
  if (enrichedData.zip) companyUpdates.zip = enrichedData.zip;
  if (enrichedData.owner_name) companyUpdates.owner_name = enrichedData.owner_name;
  if (enrichedData.primary_phone) companyUpdates.primary_phone = enrichedData.primary_phone;
  if (enrichedData.primary_email) companyUpdates.primary_email = enrichedData.primary_email;
  if (enrichedData.contractor_specialty) companyUpdates.contractor_specialty = enrichedData.contractor_specialty;
  if (enrichedData.service_area_type) companyUpdates.service_area_type = enrichedData.service_area_type;

  // v2.0 strategic signals
  Object.assign(companyUpdates, extractV2Fields(enrichedData));



  return {
    companyUpdates,
    insights: {
      market_positioning: enrichedData.market_positioning,
      competitive_advantages: enrichedData.competitive_advantages,
      growth_indicators: enrichedData.growth_indicators,
      smart_home_readiness_score: enrichedData.smart_home_readiness_score,
      recommended_approach: enrichedData.recommended_approach,
      confidence_level: enrichedData.confidence_level
    },
    confidence: enrichedData.confidence_level === 'high' ? 85 : enrichedData.confidence_level === 'medium' ? 70 : 50,
    fieldsEnriched: Object.keys(companyUpdates)
  };
}

async function enrichWithClaude(company: any, deepEnrich: boolean) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  
  const prompt = deepEnrich
    ? `Perform DEEP COMPREHENSIVE analysis of this company with PRIORITY on business metrics and digital engagement:

Company: ${company.company_name}
Industry: ${company.industry_type}
Website: ${company.website_url || 'Not provided'}
LinkedIn: ${company.linkedin_company_url || 'Not provided'}
Current data: ${JSON.stringify(company, null, 2)}

CRITICAL PRIORITIES - Research and fill ALL possible fields:

**BUSINESS METRICS (HIGHEST PRIORITY):**
- Exact employee count and company size
- Specific annual revenue range
- Years in business (calculate from founding)
- Annual installation/project volume
- Average project/home price
- Price positioning (economy/mid-market/premium/luxury)
- Revenue growth trend (year-over-year analysis)
- Profitability level and margins
- Overall financial health assessment

**FINANCIAL STABILITY RUBRIC (BINARY ASSESSMENT - YES/NO):**
- Revenue Growth Indicators - Look for: expansion, new communities, market entry, new locations, increased capacity (5 pts if YES)
- Multiple Active Projects - Look for: multiple active communities/projects simultaneously (5 pts if YES)
- Industry Awards/Recognition - Look for: builder awards, national rankings, certifications (3 pts if YES)
- Positive Reviews/Reputation - Look for: BBB A- or higher, OR 4+ stars, OR strong testimonials (2 pts if YES)

**DIGITAL ENGAGEMENT (HIGHEST PRIORITY):**
- Website quality, professionalism, content depth
- Smart home/technology content on website
- LinkedIn followers, activity, and engagement
- Facebook, Instagram, YouTube presence and URLs
- Social media activity patterns
- Technology adoption indicators
- Google Business Profile status
- Online review ratings and volume

**DEEP ANALYSIS:**
- Executive team and decision-makers
- Recent news and growth signals
- Competitive positioning and advantages
- Market trends and opportunities
- Partnership potential
- Strategic recommendations

Research extensively using provided URLs and public information.`
    : `Analyze and COMPREHENSIVELY enrich this company data with FOCUS on business metrics and digital engagement:

Company: ${company.company_name}
Industry: ${company.industry_type}
Website: ${company.website_url || 'Not provided'}
LinkedIn: ${company.linkedin_company_url || 'Not provided'}
Current data: ${JSON.stringify(company, null, 2)}

PRIORITIES:
1. Business metrics: employees, revenue, years in business, volume, pricing, growth trends, profitability, financial health
2. Digital engagement: website quality, social media URLs and activity, LinkedIn presence, online reviews
3. Technology adoption and smart home readiness

Fill as many fields as possible with accurate data.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      tools: [{
        name: 'enrich_company_data',
        description: 'Structure comprehensive enriched company data with priority on business metrics and digital engagement',
        input_schema: {
          type: 'object',
          properties: {
            // Business Metrics
            total_employees: { type: 'integer', description: 'Exact employee count' },
            total_employees_range: { type: 'string', enum: ['1-5', '6-10', '11-25', '26-50', '51-100', '101-250', '251-500', '500+'] },
            annual_revenue_range: { type: 'string', enum: ['<$500K', '$500K-$999K', '$1M-$2.9M', '$3M-$5.9M', '$6M-$10M', '$10M+'] },
            years_in_business: { type: 'integer' },
            years_in_business_range: { type: 'string', enum: ['<5', '5-10', '11-20', '21-30', '30+'] },
            annual_volume: { type: 'integer' },
            annual_volume_range: { type: 'string', enum: ['<100', '100-249', '250-499', '500-749', '750-999', '1,000-1,499', '1,500-1,999', '2,000-2,999', '3,000-4,999', '5,000-9,999', '10,000+'] },
            average_home_price: { type: 'integer' },
            average_home_price_range: { type: 'string', enum: ['<$150K', '$150K-$199K', '$200K-$249K', '$250K-$299K', '$300K-$399K', '$400K-$499K', '$500K-$599K', '$600K-$799K', '$800K-$999K', '$1M-$1.49M', '$1.5M-$1.99M', '$2M-$2.99M', '$3M+'] },
            price_point_category: { type: 'string', enum: ['economy', 'mid-market', 'premium', 'luxury'] },
            
            // Financial Stability Indicators
            revenue_growth_trend: { type: 'string', enum: ['Rapid Growth (>20% YoY)', 'Strong Growth (10-20% YoY)', 'Moderate Growth (5-10% YoY)', 'Stable (0-5% YoY)', 'Declining (<0% YoY)', 'Unknown'] },
            profitability_level: { type: 'string', enum: ['Highly Profitable (>15% margin)', 'Profitable (8-15% margin)', 'Moderately Profitable (5-8% margin)', 'Break-even (0-5% margin)', 'Unprofitable (<0% margin)', 'Unknown'] },
            financial_health_rating: { type: 'string', enum: ['Excellent', 'Good', 'Fair', 'Poor', 'At Risk', 'Unknown'] },
            
            // Financial Stability Rubric (Binary YES/NO assessments)
            revenue_growth_indicators: { type: 'boolean', description: 'Evidence of expansion, new markets, increased capacity' },
            multiple_active_projects: { type: 'boolean', description: 'Multiple active communities/projects simultaneously' },
            industry_awards_recognition: { type: 'boolean', description: 'Has received industry awards or recognition' },
            positive_reviews_reputation: { type: 'boolean', description: 'BBB A- or higher, OR 4+ stars, OR strong testimonials' },
            
            // Digital Engagement
            website_url: { type: 'string' },
            website_quality: { type: 'string', enum: ['None', 'Poor', 'Basic', 'Good', 'Professional'] },
            website_has_smart_home_content: { type: 'boolean' },
            website_last_updated: { type: 'string', enum: ['Recently', 'Within 6 months', 'Within 1 year', 'Over 1 year', 'Unknown'] },
            
            linkedin_company_url: { type: 'string' },
            linkedin_followers_range: { type: 'string', enum: ['No page', '<500', '500-1K', '1K-5K', '5K-10K', '10K+'] },
            linkedin_activity_level: { type: 'string', enum: ['None', 'Low', 'Moderate', 'Active', 'Very Active'] },
            
            facebook_url: { type: 'string' },
            instagram_url: { type: 'string' },
            youtube_url: { type: 'string' },
            social_media_presence: { type: 'string', enum: ['None', 'Limited', 'Moderate', 'Active', 'Very Active'] },
            
            technology_adoption_level: { type: 'string', enum: ['Traditional', 'Late Adopter', 'Mainstream', 'Early Adopter', 'Industry Leader'] },
            has_google_business_profile: { type: 'boolean' },
            online_review_rating: { type: 'number' },
            online_review_count_range: { type: 'string', enum: ['None', '<10', '10-24', '25-49', '50-99', '100+'] },
            
            // Location & Contact
            city: { type: 'string', description: 'City where company is headquartered' },
            state: { type: 'string', description: 'State abbreviation (2-letter code)' },
            address_line1: { type: 'string', description: 'Street address of headquarters' },
            zip: { type: 'string', description: 'ZIP/postal code' },
            owner_name: { type: 'string', description: 'Owner or CEO name' },
            primary_phone: { type: 'string', description: 'Main business phone number' },
            primary_email: { type: 'string', description: 'Main business email address' },
            contractor_specialty: { type: 'string', enum: ['HVAC', 'Plumbing', 'Electrical', 'General', 'Mechanical', 'Solar', 'Roofing'], description: 'Primary contractor specialty' },
            service_area_type: { type: 'string', enum: ['Local', 'Regional', 'Statewide', 'Multi-State', 'National'], description: 'Geographic service coverage' },
            
            // AI Insights
            market_positioning: { type: 'string' },
            competitive_advantages: { type: 'array', items: { type: 'string' } },
            growth_indicators: { type: 'array', items: { type: 'string' } },
            smart_home_readiness_score: { type: 'integer', minimum: 0, maximum: 100 },
            recommended_approach: { type: 'string' },
            confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] },
            ...V2_STRATEGIC_TOOL_PROPERTIES,
          }
        }
      }],
      tool_choice: { type: 'tool', name: 'enrich_company_data' },
      system: buildEnrichmentSystemPrompt(company.industry_type),
      messages: [{ role: 'user', content: prompt }]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const toolUse = data.content.find((c: any) => c.type === 'tool_use');
  
  if (!toolUse) {
    throw new Error('No structured data returned from Claude');
  }

  const enrichedData = toolUse.input;

  // Build company updates - only include fields that have values
  const companyUpdates: any = {};
  
  // Business metrics
  if (enrichedData.total_employees) companyUpdates.total_employees = enrichedData.total_employees;
  if (enrichedData.total_employees_range) companyUpdates.total_employees_range = enrichedData.total_employees_range;
  if (enrichedData.annual_revenue_range) companyUpdates.annual_revenue_range = enrichedData.annual_revenue_range;
  if (enrichedData.years_in_business) companyUpdates.years_in_business = enrichedData.years_in_business;
  if (enrichedData.years_in_business_range) companyUpdates.years_in_business_range = enrichedData.years_in_business_range;
  if (enrichedData.annual_volume) companyUpdates.annual_volume = enrichedData.annual_volume;
  if (enrichedData.annual_volume_range) companyUpdates.annual_volume_range = enrichedData.annual_volume_range;
  if (enrichedData.average_home_price) companyUpdates.average_home_price = enrichedData.average_home_price;
  if (enrichedData.average_home_price_range) companyUpdates.average_home_price_range = enrichedData.average_home_price_range;
  if (enrichedData.price_point_category) companyUpdates.price_point_category = enrichedData.price_point_category;
  
  // Financial stability indicators
  if (enrichedData.revenue_growth_trend && enrichedData.revenue_growth_trend !== 'Unknown') companyUpdates.revenue_growth_trend = enrichedData.revenue_growth_trend;
  if (enrichedData.profitability_level && enrichedData.profitability_level !== 'Unknown') companyUpdates.profitability_level = enrichedData.profitability_level;
  if (enrichedData.financial_health_rating && enrichedData.financial_health_rating !== 'Unknown') companyUpdates.financial_health_rating = enrichedData.financial_health_rating;
  
  // Financial Stability Rubric (Binary)
  if (enrichedData.revenue_growth_indicators !== undefined) companyUpdates.revenue_growth_indicators = enrichedData.revenue_growth_indicators;
  if (enrichedData.multiple_active_projects !== undefined) companyUpdates.multiple_active_projects = enrichedData.multiple_active_projects;
  if (enrichedData.industry_awards_recognition !== undefined) companyUpdates.industry_awards_recognition = enrichedData.industry_awards_recognition;
  if (enrichedData.positive_reviews_reputation !== undefined) companyUpdates.positive_reviews_reputation = enrichedData.positive_reviews_reputation;
  
  // Digital engagement
  if (enrichedData.website_url) companyUpdates.website_url = enrichedData.website_url;
  if (enrichedData.website_quality) companyUpdates.website_quality = enrichedData.website_quality;
  if (enrichedData.website_has_smart_home_content !== undefined) companyUpdates.website_has_smart_home_content = enrichedData.website_has_smart_home_content;
  if (enrichedData.website_last_updated) companyUpdates.website_last_updated = enrichedData.website_last_updated;
  
  if (enrichedData.linkedin_company_url) companyUpdates.linkedin_company_url = enrichedData.linkedin_company_url;
  if (enrichedData.linkedin_followers_range) companyUpdates.linkedin_followers_range = enrichedData.linkedin_followers_range;
  if (enrichedData.linkedin_activity_level) companyUpdates.linkedin_activity_level = enrichedData.linkedin_activity_level;
  
  if (enrichedData.facebook_url) companyUpdates.facebook_url = enrichedData.facebook_url;
  if (enrichedData.instagram_url) companyUpdates.instagram_url = enrichedData.instagram_url;
  if (enrichedData.youtube_url) companyUpdates.youtube_url = enrichedData.youtube_url;
  if (enrichedData.social_media_presence) companyUpdates.social_media_presence = enrichedData.social_media_presence;
  
  if (enrichedData.technology_adoption_level) {
    const tech = normalizeTechAdoption(enrichedData.technology_adoption_level);
    if (tech) companyUpdates.technology_adoption_level = tech;
  }
  if (enrichedData.has_google_business_profile !== undefined) companyUpdates.has_google_business_profile = enrichedData.has_google_business_profile;
  if (enrichedData.online_review_rating) companyUpdates.online_review_rating = enrichedData.online_review_rating;
  if (enrichedData.online_review_count_range) companyUpdates.online_review_count_range = enrichedData.online_review_count_range;

  // Location & Contact
  if (enrichedData.city) companyUpdates.city = enrichedData.city;
  if (enrichedData.state) companyUpdates.state = enrichedData.state;
  if (enrichedData.address_line1) companyUpdates.address_line1 = enrichedData.address_line1;
  if (enrichedData.zip) companyUpdates.zip = enrichedData.zip;
  if (enrichedData.owner_name) companyUpdates.owner_name = enrichedData.owner_name;
  if (enrichedData.primary_phone) companyUpdates.primary_phone = enrichedData.primary_phone;
  if (enrichedData.primary_email) companyUpdates.primary_email = enrichedData.primary_email;
  if (enrichedData.contractor_specialty) companyUpdates.contractor_specialty = enrichedData.contractor_specialty;
  if (enrichedData.service_area_type) companyUpdates.service_area_type = enrichedData.service_area_type;

  // v2.0 strategic signals
  Object.assign(companyUpdates, extractV2Fields(enrichedData));



  return {
    companyUpdates,
    insights: {
      market_positioning: enrichedData.market_positioning,
      competitive_advantages: enrichedData.competitive_advantages,
      growth_indicators: enrichedData.growth_indicators,
      smart_home_readiness_score: enrichedData.smart_home_readiness_score,
      recommended_approach: enrichedData.recommended_approach,
      confidence_level: enrichedData.confidence_level
    },
    confidence: enrichedData.confidence_level === 'high' ? 90 : enrichedData.confidence_level === 'medium' ? 75 : 55,
    fieldsEnriched: Object.keys(companyUpdates)
  };
}
