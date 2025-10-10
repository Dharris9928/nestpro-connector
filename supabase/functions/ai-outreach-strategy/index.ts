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
        const rateLimitResponse = await checkRateLimit(supabase, user.id, 'ai-outreach-strategy');
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
    }

    const { companyId } = await req.json();

    // Fetch company with all relevant data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        *,
        contacts(first_name, last_name, title, decision_tier, email, phone, linkedin_url),
        outreach_activities(activity_type, outcome, scheduled_date, notes),
        company_ai_insights(market_positioning, recommended_approach, competitive_advantages)
      `)
      .eq('id', companyId)
      .single();

    if (companyError) throw companyError;

    // Build AI prompt with company context
    const systemPrompt = `You are an expert B2B sales strategist specializing in the smart home and construction industry. Create personalized outreach strategies based on company data.

Consider:
- Industry type (Builder vs Contractor)
- Company size and stability
- Digital presence and engagement
- Current smart home offerings
- Decision maker information
- Past outreach attempts
- Financial stability indicators

Provide practical, actionable strategies.`;

    const companyContext = {
      name: company.company_name,
      industryType: company.industry_type,
      segment: company.segment,
      leadScore: company.lead_score,
      priorityTier: company.priority_tier,
      website: company.website_url,
      linkedin: company.linkedin_company_url,
      currentSmartHomeOfferings: company.current_smart_home_offerings,
      websiteHasSmartHomeContent: company.website_has_smart_home_content,
      technologyAdoptionLevel: company.technology_adoption_level,
      revenueGrowth: company.revenue_growth_indicators,
      multipleProjects: company.multiple_active_projects,
      awards: company.industry_awards_recognition,
      positiveReviews: company.positive_reviews_reputation,
      contacts: company.contacts?.map((c: any) => ({
        name: `${c.first_name} ${c.last_name}`,
        title: c.title,
        tier: c.decision_tier,
        hasEmail: !!c.email,
        hasPhone: !!c.phone,
        hasLinkedIn: !!c.linkedin_url
      })),
      pastOutreach: company.outreach_activities?.length || 0,
      aiInsights: company.company_ai_insights?.[0] || null
    };

    const userPrompt = `Create a personalized outreach strategy for this company:\n\n${JSON.stringify(companyContext, null, 2)}\n\nProvide:\n1. Primary outreach approach and channel\n2. Key value propositions to emphasize\n3. Specific talking points based on their situation\n4. Sequence of 3-5 touchpoints with timing\n5. Personalization elements to include\n6. Potential objections and responses`;

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
            name: 'generate_outreach_strategy',
            description: 'Generate a personalized outreach strategy',
            parameters: {
              type: 'object',
              properties: {
                primaryApproach: {
                  type: 'object',
                  properties: {
                    channel: { type: 'string', enum: ['Email', 'Phone', 'LinkedIn', 'In-Person'] },
                    reasoning: { type: 'string' }
                  }
                },
                valuePropositions: { type: 'array', items: { type: 'string' } },
                talkingPoints: { type: 'array', items: { type: 'string' } },
                touchpointSequence: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      step: { type: 'number' },
                      timing: { type: 'string' },
                      channel: { type: 'string' },
                      message: { type: 'string' }
                    }
                  }
                },
                personalizationElements: { type: 'array', items: { type: 'string' } },
                objectionHandling: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      objection: { type: 'string' },
                      response: { type: 'string' }
                    }
                  }
                }
              },
              required: ['primaryApproach', 'valuePropositions', 'talkingPoints', 'touchpointSequence']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_outreach_strategy' } }
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

    const strategy = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ strategy }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-outreach-strategy:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});