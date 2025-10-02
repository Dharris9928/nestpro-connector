import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { enrichmentLogId } = await req.json();

    if (!enrichmentLogId) {
      return new Response(
        JSON.stringify({ error: 'enrichmentLogId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the enrichment log
    const { data: log, error: logError } = await supabase
      .from('enrichment_logs')
      .select('*')
      .eq('id', enrichmentLogId)
      .single();

    if (logError || !log) {
      return new Response(
        JSON.stringify({ error: 'Enrichment log not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check company access
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', log.company_id)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Force-applying enrichment from log ${enrichmentLogId} to company ${log.company_id}`);

    // Extract the fields and values from the log
    const fieldsEnriched = log.fields_enriched || {};
    
    // If fields_enriched is an array (old format), we can't force-apply
    if (Array.isArray(fieldsEnriched)) {
      return new Response(
        JSON.stringify({ error: 'This enrichment log does not contain field values. Please run a new enrichment.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and prepare updates
    const sanitize = (obj: Record<string, any>) => {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'string') {
          out[k] = v.trim();
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    let updates = sanitize(fieldsEnriched);

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid fields to apply' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Attempting to force-apply ${Object.keys(updates).length} fields:`, Object.keys(updates));

    // Attempt update with graceful degradation for constraint failures
    const tryUpdate = async () => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', log.company_id)
        .select('*')
        .single();
      return { data, error };
    };

    let { data: updatedCompany, error: updateError } = await tryUpdate();
    let failedFields: string[] = [];

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
      console.error('Force-apply update failed:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to apply enrichment', 
          details: (updateError as any).message || 'Unknown error',
          failedFields
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appliedFields = Object.keys(updates).filter(f => !failedFields.includes(f));
    console.log(`Successfully applied ${appliedFields.length} fields:`, appliedFields);

    // Log the manual re-application
    await supabase.from('enrichment_logs').insert({
      company_id: log.company_id,
      provider: log.provider + '_manual',
      enrichment_type: 'manual_reapply',
      status: 'success',
      confidence_score: log.confidence_score,
      fields_enriched: updates,
      created_by: user.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        appliedFields,
        failedFields,
        message: `Successfully applied ${appliedFields.length} field(s)${failedFields.length > 0 ? `, ${failedFields.length} field(s) skipped due to constraints` : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Force-apply enrichment error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
