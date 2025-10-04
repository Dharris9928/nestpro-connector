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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { companyId, communicationType, previousContext, aiModel } = await req.json();

    // Fetch company data with contacts and AI insights
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        *,
        company_ai_insights(*),
        contacts(*)
      `)
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch recent communications for context
    const { data: recentComms } = await supabase
      .from('company_communications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(3);

    // Build context for AI
    const companyContext = {
      name: company.company_name,
      industryType: company.industry_type,
      segment: company.segment,
      status: company.status,
      priorityTier: company.priority_tier,
      leadScore: company.lead_score,
      websiteUrl: company.website_url,
      city: company.city,
      state: company.state,
      annualVolume: company.annual_volume_range,
      revenue: company.annual_revenue_range,
      employees: company.total_employees_range,
      yearsInBusiness: company.years_in_business_range,
      contractorSpecialty: company.contractor_specialty,
      aiInsights: company.company_ai_insights?.[0] ? {
        segmentRationale: company.company_ai_insights[0].segment_rationale,
        recommendedApproach: company.company_ai_insights[0].recommended_approach,
        marketPositioning: company.company_ai_insights[0].market_positioning,
        competitiveAdvantages: company.company_ai_insights[0].competitive_advantages,
      } : null,
      contacts: company.contacts?.map((c: any) => ({
        name: `${c.first_name} ${c.last_name}`,
        title: c.title,
        decisionTier: c.decision_tier,
      })),
    };

    // Build system prompt based on communication type
    let systemPrompt = '';
    let userPrompt = '';

    if (communicationType === 'email') {
      systemPrompt = `You are an expert B2B sales email writer for Google Nest Pro products. 
Your goal is to write compelling, personalized emails that drive engagement and meetings.
Focus on value proposition, pain points, and building relationships.
Keep emails concise (under 200 words), professional, and action-oriented.`;

      userPrompt = `Generate a personalized sales email for ${company.company_name}.

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Communication Context:\n${previousContext}\n\n` : ''}

${recentComms && recentComms.length > 0 ? `Recent Communication History:\n${recentComms.map(c => `- ${c.communication_type}: ${c.subject || 'No subject'}`).join('\n')}\n\n` : ''}

Generate an email with:
1. A compelling subject line
2. Personalized opening that shows you understand their business
3. Clear value proposition relevant to their segment and needs
4. Specific call-to-action
5. Professional closing

Return in JSON format:
{
  "subject": "subject line here",
  "content": "email body here"
}`;
    } else if (communicationType === 'call_script') {
      systemPrompt = `You are an expert B2B sales call script writer for Google Nest Pro products.
Your goal is to create effective call scripts that build rapport, uncover needs, and drive next steps.
Include discovery questions, objection handling, and clear value propositions.`;

      userPrompt = `Generate a personalized call script for ${company.company_name}.

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Communication Context:\n${previousContext}\n\n` : ''}

${recentComms && recentComms.length > 0 ? `Recent Communication History:\n${recentComms.map(c => `- ${c.communication_type}: ${c.subject || 'No subject'}`).join('\n')}\n\n` : ''}

Generate a call script with:
1. Opening/Introduction
2. Discovery questions tailored to their business
3. Value proposition relevant to their segment
4. Key talking points about Nest Pro benefits
5. Objection handling responses
6. Call-to-action and next steps

Return in JSON format:
{
  "content": "full call script here with clear sections"
}`;
    } else if (communicationType === 'linkedin_message') {
      systemPrompt = `You are an expert at crafting LinkedIn connection requests and messages.
Keep messages brief (under 300 characters for initial connection), professional, and focused on building relationships.
Reference specific details about their company to show genuine interest.`;

      userPrompt = `Generate a personalized LinkedIn message for ${company.company_name}.

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Context:\n${previousContext}\n\n` : ''}

Generate a LinkedIn message that is:
1. Brief and professional
2. Shows you've researched their company
3. Provides a compelling reason to connect
4. Includes a soft call-to-action

Return in JSON format:
{
  "content": "linkedin message here"
}`;
    }

    // Call Lovable AI
    const selectedModel = aiModel || 'google/gemini-2.5-flash';
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices[0].message.content;
    
    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(generatedText);
    } catch (e) {
      console.error('Failed to parse AI response:', generatedText);
      parsedResponse = {
        subject: communicationType === 'email' ? 'Generated Email' : undefined,
        content: generatedText,
      };
    }

    // Save to database
    const { data: savedComm, error: saveError } = await supabase
      .from('company_communications')
      .insert({
        company_id: companyId,
        user_id: user.id,
        communication_type: communicationType,
        subject: parsedResponse.subject,
        content: parsedResponse.content,
        previous_context: previousContext,
        ai_model: selectedModel,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving communication:', saveError);
      throw saveError;
    }

    return new Response(JSON.stringify({
      success: true,
      communication: savedComm,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-communication:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});