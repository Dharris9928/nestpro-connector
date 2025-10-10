import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user and check rate limit
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!authError && user) {
        const rateLimitResponse = await checkRateLimit(supabase, user.id, 'ai-prioritize-leads');
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
    }

    const { companyIds } = await req.json();

    // Fetch companies with all relevant data
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select(`
        *,
        contacts(id, first_name, last_name, title, decision_tier),
        outreach_activities(id, activity_type, outcome, scheduled_date),
        enrichment_logs(id, status, created_at)
      `)
      .in('id', companyIds);

    if (companiesError) throw companiesError;

    // Build AI prompt
    const systemPrompt = `You are an expert sales strategist. Analyze these companies and provide prioritization recommendations.

For each company, consider:
- Lead score and priority tier
- Industry type and segment
- Data completeness
- Digital engagement (website, LinkedIn, social)
- Contact availability and decision maker access
- Financial stability indicators
- Recent enrichment activity
- Outreach history

Provide clear, actionable prioritization advice.`;

    const companyData = companies.map(c => ({
      id: c.id,
      name: c.company_name,
      industryType: c.industry_type,
      segment: c.segment,
      leadScore: c.lead_score,
      priorityTier: c.priority_tier,
      status: c.status,
      website: c.website_url ? 'Yes' : 'No',
      linkedin: c.linkedin_company_url ? 'Yes' : 'No',
      contactCount: c.contacts?.length || 0,
      hasDecisionMakers: c.contacts?.some((ct: any) => ct.decision_tier === 'Primary') || false,
      revenueGrowth: c.revenue_growth_indicators,
      multipleProjects: c.multiple_active_projects,
      awards: c.industry_awards_recognition,
      positiveReviews: c.positive_reviews_reputation,
      lastEnriched: c.enrichment_logs?.[0]?.created_at || null,
      recentOutreach: c.outreach_activities?.filter((a: any) => 
        new Date(a.scheduled_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length || 0
    }));

    const userPrompt = `Analyze these ${companies.length} companies and provide prioritization recommendations:\n\n${JSON.stringify(companyData, null, 2)}\n\nFor each company, provide:\n1. Priority score (1-100)\n2. Key reasons for prioritization\n3. Recommended next action\n4. Potential objections or concerns\n5. Estimated conversion probability`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'prioritize_companies',
            description: 'Return prioritization analysis for companies',
            parameters: {
              type: 'object',
              properties: {
                analyses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      companyId: { type: 'string' },
                      priorityScore: { type: 'number', minimum: 1, maximum: 100 },
                      keyReasons: { type: 'array', items: { type: 'string' } },
                      recommendedAction: { type: 'string' },
                      concerns: { type: 'array', items: { type: 'string' } },
                      conversionProbability: { type: 'string', enum: ['High', 'Medium', 'Low'] }
                    },
                    required: ['companyId', 'priorityScore', 'keyReasons', 'recommendedAction', 'conversionProbability']
                  }
                }
              },
              required: ['analyses']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'prioritize_companies' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call returned from AI');
    }

    const analyses = JSON.parse(toolCall.function.arguments).analyses;

    return new Response(
      JSON.stringify({ analyses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-prioritize-leads:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});