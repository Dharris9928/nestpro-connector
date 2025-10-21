import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
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

    // Check rate limit
    const rateLimitResponse = await checkRateLimit(supabase, user.id, 'generate-communication');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { companyId, communicationType, previousContext, aiModel, contactId, businessContext, outreachPrompt, opportunityId } = await req.json();

    // Fetch permanent business context settings
    const { data: businessContextSettings } = await supabase
      .from('business_context_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Build comprehensive business context
    let fullBusinessContext = '';
    if (businessContextSettings) {
      const contextParts = [];
      if (businessContextSettings.business_description) {
        contextParts.push(`Business: ${businessContextSettings.business_description}`);
      }
      if (businessContextSettings.team_mission) {
        contextParts.push(`Mission: ${businessContextSettings.team_mission}`);
      }
      if (businessContextSettings.value_proposition) {
        contextParts.push(`Value Proposition: ${businessContextSettings.value_proposition}`);
      }
      if (businessContextSettings.target_customer_profile) {
        contextParts.push(`Target Customers: ${businessContextSettings.target_customer_profile}`);
      }
      if (businessContextSettings.key_products_services) {
        contextParts.push(`Products/Services: ${businessContextSettings.key_products_services}`);
      }
      if (businessContextSettings.communication_guidelines) {
        contextParts.push(`Communication Guidelines: ${businessContextSettings.communication_guidelines}`);
      }
      
      if (contextParts.length > 0) {
        fullBusinessContext = contextParts.join('\n\n');
      }
    }

    // If user provided additional business context, append it
    if (businessContext) {
      fullBusinessContext = fullBusinessContext 
        ? `${fullBusinessContext}\n\nAdditional Context: ${businessContext}`
        : businessContext;
    }

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

    // Fetch specific contact if contactId provided
    let targetContact = null;
    if (contactId) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      targetContact = contact;
    }

    // Fetch recent communications for context
    const { data: recentComms } = await supabase
      .from('company_communications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(3);

    // Fetch opportunity data if provided
    let opportunityData = null;
    if (opportunityId) {
      const { data } = await supabase
        .from('opportunities')
        .select('*, opportunity_products(*)')
        .eq('id', opportunityId)
        .single();
      opportunityData = data;
    }

    // Fetch won opportunities with timelines for learning
    const { data: wonOpportunities } = await supabase
      .from('opportunities')
      .select(`
        *,
        company_communications!inner(communication_type, generated_at, sent_at)
      `)
      .eq('company_id', companyId)
      .eq('stage', 'won')
      .order('closed_date', { ascending: false })
      .limit(5);

    // Calculate average time to close for won deals
    let avgTimeToClose = null;
    if (wonOpportunities && wonOpportunities.length > 0) {
      const timelines = wonOpportunities
        .filter(o => o.created_at && o.closed_date)
        .map(o => {
          const created = new Date(o.created_at);
          const closed = new Date(o.closed_date);
          return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });
      
      if (timelines.length > 0) {
        avgTimeToClose = Math.round(timelines.reduce((a, b) => a + b, 0) / timelines.length);
      }
    }

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
      targetContact: targetContact ? {
        name: `${targetContact.first_name} ${targetContact.last_name}`,
        title: targetContact.title,
        email: targetContact.email,
        phone: targetContact.phone,
        decisionTier: targetContact.decision_tier,
        linkedinUrl: targetContact.linkedin_url,
      } : null,
      opportunity: opportunityData,
      wonOpportunities: wonOpportunities || [],
      avgTimeToClose
    };

    // Build system prompt based on communication type
    let systemPrompt = '';
    let userPrompt = '';

    if (communicationType === 'email') {
      systemPrompt = `You are an expert B2B sales email writer${fullBusinessContext ? `. ${fullBusinessContext}` : ' for Google Nest Pro products'}. 
Your goal is to write compelling, personalized emails that drive engagement and meetings.
Focus on value proposition, pain points, and building relationships.
Keep emails concise (under 200 words), professional, and action-oriented.`;

      userPrompt = `Generate a personalized sales email for ${company.company_name}${targetContact ? ` to ${targetContact.first_name} ${targetContact.last_name} (${targetContact.title || 'Contact'})` : ''}.

${fullBusinessContext ? `YOUR BUSINESS CONTEXT:\n${fullBusinessContext}\n\n` : ''}

${outreachPrompt ? `OUTREACH PURPOSE:\n${outreachPrompt}\n\n` : ''}

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Communication Context:\n${previousContext}\n\n` : ''}

${recentComms && recentComms.length > 0 ? `Recent Communication History:\n${recentComms.map(c => `- ${c.communication_type}: ${c.subject || 'No subject'}`).join('\n')}\n\n` : ''}

${targetContact ? `Target Contact:\n- Name: ${targetContact.first_name} ${targetContact.last_name}\n- Title: ${targetContact.title || 'Not specified'}\n- Decision Tier: ${targetContact.decision_tier}\n- Email: ${targetContact.email || 'Not available'}\n${targetContact.linkedinUrl ? `- LinkedIn: ${targetContact.linkedinUrl}\n` : ''}\n` : ''}

Opportunity Information:
${companyContext.opportunity ? `Opportunity: ${companyContext.opportunity.opportunity_name}
Stage: ${companyContext.opportunity.stage}
Amount: $${companyContext.opportunity.amount || 'Not specified'}
Expected Close: ${companyContext.opportunity.expected_close_date || 'Not specified'}` : 'No specific opportunity linked'}

Historical Performance:
${companyContext.wonOpportunities.length > 0 ? `
- Previously won ${companyContext.wonOpportunities.length} opportunities with this company
- Average time to close: ${companyContext.avgTimeToClose} days
- Communication patterns that led to wins: ${JSON.stringify(companyContext.wonOpportunities.map(o => ({
  stage: o.stage,
  communications: o.company_communications?.length || 0,
  timeline: o.closed_date
})))}
USE THIS DATA to craft messaging that mirrors successful past approaches.` : 'No previous wins with this company - use best practices for new opportunities'}

Generate an email with:
1. A compelling subject line
2. Personalized opening that shows you understand their business
3. Clear value proposition relevant to their segment and needs
4. Specific call-to-action
5. Professional closing

${outreachPrompt ? 'IMPORTANT: Center the email around the outreach purpose specified above.' : ''}

Return in JSON format:
{
  "subject": "subject line here",
  "content": "email body here"
}`;
    } else if (communicationType === 'call_script') {
      systemPrompt = `You are an expert B2B sales call script writer${fullBusinessContext ? `. ${fullBusinessContext}` : ' for Google Nest Pro products'}.
Your goal is to create effective call scripts that build rapport, uncover needs, and drive next steps.
Include discovery questions, objection handling, and clear value propositions.`;

      userPrompt = `Generate a personalized call script for ${company.company_name}${targetContact ? ` when speaking with ${targetContact.first_name} ${targetContact.last_name} (${targetContact.title || 'Contact'})` : ''}.

${fullBusinessContext ? `YOUR BUSINESS CONTEXT:\n${fullBusinessContext}\n\n` : ''}

${outreachPrompt ? `OUTREACH PURPOSE:\n${outreachPrompt}\n\n` : ''}

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Communication Context:\n${previousContext}\n\n` : ''}

${recentComms && recentComms.length > 0 ? `Recent Communication History:\n${recentComms.map(c => `- ${c.communication_type}: ${c.subject || 'No subject'}`).join('\n')}\n\n` : ''}

${targetContact ? `Target Contact:\n- Name: ${targetContact.first_name} ${targetContact.last_name}\n- Title: ${targetContact.title || 'Not specified'}\n- Decision Tier: ${targetContact.decision_tier}\n- Phone: ${targetContact.phone || 'Not available'}\n${targetContact.linkedinUrl ? `- LinkedIn: ${targetContact.linkedinUrl}\n` : ''}\n` : ''}

Generate a call script with:
1. Opening/Introduction
2. Discovery questions tailored to their business
3. Value proposition relevant to their segment
4. Key talking points about Nest Pro benefits
5. Objection handling responses
6. Call-to-action and next steps

${outreachPrompt ? 'IMPORTANT: Align the call script to address the outreach purpose specified above.' : ''}

Return in JSON format:
{
  "content": "full call script here with clear sections"
}`;
    } else if (communicationType === 'linkedin_message') {
      systemPrompt = `You are an expert at crafting LinkedIn connection requests and messages${fullBusinessContext ? `. ${fullBusinessContext}` : ''}.
Keep messages brief (under 300 characters for initial connection), professional, and focused on building relationships.
Reference specific details about their company to show genuine interest.`;

      userPrompt = `Generate a personalized LinkedIn message for ${company.company_name}${targetContact ? ` to connect with ${targetContact.first_name} ${targetContact.last_name} (${targetContact.title || 'Contact'})` : ''}.

${fullBusinessContext ? `YOUR BUSINESS CONTEXT:\n${fullBusinessContext}\n\n` : ''}

${outreachPrompt ? `OUTREACH PURPOSE:\n${outreachPrompt}\n\n` : ''}

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Context:\n${previousContext}\n\n` : ''}

${targetContact ? `Target Contact:\n- Name: ${targetContact.first_name} ${targetContact.last_name}\n- Title: ${targetContact.title || 'Not specified'}\n- Decision Tier: ${targetContact.decision_tier}\n${targetContact.linkedinUrl ? `- LinkedIn: ${targetContact.linkedinUrl}\n` : ''}\n` : ''}

Generate a LinkedIn message that is:
1. Brief and professional
2. Shows you've researched their company
3. Provides a compelling reason to connect
4. Includes a soft call-to-action

${outreachPrompt ? 'IMPORTANT: Tailor the message to address the outreach purpose specified above.' : ''}

Return in JSON format:
{
  "content": "linkedin message here"
}`;
    } else if (communicationType === 'phone') {
      systemPrompt = `You are an expert at crafting phone conversation guides${fullBusinessContext ? `. ${fullBusinessContext}` : ''}.
Create natural, conversational guides that help sales reps have authentic conversations.
Focus on building rapport, active listening, and value-based discussions.`;

      userPrompt = `Generate a phone conversation guide for ${company.company_name}${targetContact ? ` when speaking with ${targetContact.first_name} ${targetContact.last_name} (${targetContact.title || 'Contact'})` : ''}.

${fullBusinessContext ? `YOUR BUSINESS CONTEXT:\n${fullBusinessContext}\n\n` : ''}

${outreachPrompt ? `OUTREACH PURPOSE:\n${outreachPrompt}\n\n` : ''}

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Context:\n${previousContext}\n\n` : ''}

Generate a conversation guide with:
1. Ice breaker and rapport building
2. Key questions to ask
3. Value points to mention
4. Next steps to propose

Return in JSON format:
{
  "content": "conversation guide here"
}`;
    } else if (communicationType === 'meeting') {
      systemPrompt = `You are an expert at crafting meeting agendas and discussion guides${fullBusinessContext ? `. ${fullBusinessContext}` : ''}.
Create structured agendas that maximize meeting value and drive decisions.`;

      userPrompt = `Generate a meeting agenda and discussion guide for ${company.company_name}${targetContact ? ` with ${targetContact.first_name} ${targetContact.last_name} (${targetContact.title || 'Contact'})` : ''}.

${fullBusinessContext ? `YOUR BUSINESS CONTEXT:\n${fullBusinessContext}\n\n` : ''}

${outreachPrompt ? `MEETING PURPOSE:\n${outreachPrompt}\n\n` : ''}

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Context:\n${previousContext}\n\n` : ''}

Generate a meeting guide with:
1. Meeting objectives
2. Agenda items with time allocations
3. Discussion topics and questions
4. Desired outcomes and next steps

Return in JSON format:
{
  "subject": "meeting title",
  "content": "meeting agenda and discussion guide"
}`;
    } else if (communicationType === 'demo') {
      systemPrompt = `You are an expert at crafting product demo scripts and guides${fullBusinessContext ? `. ${fullBusinessContext}` : ''}.
Create engaging demo flows that highlight value and address specific customer needs.`;

      userPrompt = `Generate a product demo script for ${company.company_name}${targetContact ? ` with ${targetContact.first_name} ${targetContact.last_name} (${targetContact.title || 'Contact'})` : ''}.

${fullBusinessContext ? `YOUR BUSINESS CONTEXT:\n${fullBusinessContext}\n\n` : ''}

${outreachPrompt ? `DEMO FOCUS:\n${outreachPrompt}\n\n` : ''}

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Context:\n${previousContext}\n\n` : ''}

Generate a demo script with:
1. Demo opening and context setting
2. Feature showcase tailored to their needs
3. Use cases relevant to their business
4. Q&A preparation
5. Next steps and closing

Return in JSON format:
{
  "subject": "demo title",
  "content": "demo script and guide"
}`;
    } else if (communicationType === 'training') {
      systemPrompt = `You are an expert at creating training materials and session guides${fullBusinessContext ? `. ${fullBusinessContext}` : ''}.
Create comprehensive training guides that educate and empower.`;

      userPrompt = `Generate a training session guide for ${company.company_name}${targetContact ? ` with ${targetContact.first_name} ${targetContact.last_name} (${targetContact.title || 'Contact'})` : ''}.

${fullBusinessContext ? `YOUR BUSINESS CONTEXT:\n${fullBusinessContext}\n\n` : ''}

${outreachPrompt ? `TRAINING FOCUS:\n${outreachPrompt}\n\n` : ''}

Company Context:
${JSON.stringify(companyContext, null, 2)}

${previousContext ? `Previous Context:\n${previousContext}\n\n` : ''}

Generate a training guide with:
1. Training objectives and outcomes
2. Session outline with modules
3. Key concepts to cover
4. Hands-on exercises or examples
5. Q&A topics and resources

Return in JSON format:
{
  "subject": "training title",
  "content": "training session guide"
}`;
    }

    // Call Claude AI for superior writing quality
    const selectedModel = aiModel || 'claude-sonnet-4-5';
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
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
    const generatedText = aiData.content[0].text;
    
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
        contact_id: contactId || null,
        opportunity_id: opportunityId || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving communication:', saveError);
      throw saveError;
    }

    // Log AI usage
    await supabase.from('ai_usage_logs').insert({
      user_id: user.id,
      feature_type: 'communication_generation',
      ai_model: selectedModel,
      prompt_tokens: aiData.usage?.input_tokens || null,
      completion_tokens: aiData.usage?.output_tokens || null,
      total_tokens: (aiData.usage?.input_tokens || 0) + (aiData.usage?.output_tokens || 0),
      company_id: companyId,
      contact_id: contactId || null,
      communication_id: savedComm.id,
      request_metadata: {
        communication_type: communicationType,
        has_previous_context: !!previousContext,
        has_outreach_prompt: !!outreachPrompt,
        has_business_context: !!businessContext,
      },
      status: 'success',
    });

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