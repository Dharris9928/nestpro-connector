import { corsHeaders } from '../_shared/cors.ts';
import { verifyUser } from '../_shared/authorization.ts';

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, supabase } = await verifyUser(req);

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { outline } = await req.json();

    if (!outline) {
      return new Response(
        JSON.stringify({ error: 'Outline text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are generating a professional, scrollable webpage presentation with Google branding for leadership teams.

INPUT: Detailed outline with sections, subsections, data points, and formatting cues.

OUTPUT: JSON array of sections that create a cohesive, scrollable webpage presentation.

SECTION TYPES:
1. hero: Opening title section with subtitle
   - Use for main title and presentation purpose
   - Fields: title (string), subtitle (string), background (hex color)

2. content: Standard text and bullet content
   - Use for explanations, lists, key points
   - Fields: title (string), content (string, optional), bullets (string[], optional), accent (hex color)

3. data-highlight: Large metrics with context
   - Use for KPIs, statistics, key numbers
   - Fields: title (string), metrics (array of {value: string, label: string, change?: string}), accent (hex color)

4. comparison: Before/After or side-by-side layouts
   - Use for showing improvements, contrasts
   - Fields: title (string), leftContent (string with \n for bullets), rightContent (string with \n for bullets), accent (hex color)

5. process-flow: Multi-stage workflow diagrams
   - Use for operational flows, procedures
   - Fields: title (string), items (array of {title: string, description: string})

6. timeline: Roadmap visualization
   - Use for quarterly goals, project timelines
   - Fields: title (string), timeline (array of {date: string, title: string, description: string})

7. multi-column: 2-4 column layouts for dense data
   - Use for categorized lists, segment breakdowns
   - Fields: title (string), columns (array of {title: string, items: string[]})

8. question-board: Discussion prompts
   - Use for meeting discussion topics, strategic questions
   - Fields: title (string), questions (string[]), accent (hex color)

9. divider: Section separators with title
   - Use between major presentation sections
   - Fields: title (string), accent (hex color), background (hex color)

10. flowchart: Visual workflow with decision points and branching
   - Use for operational flows with YES/NO decision branches
   - Fields: title (string), flowchartNodes (array of {id: string, label: string, description?: string, type?: 'start'|'process'|'decision'|'end', color?: hex}), flowchartConnections (array of {from: string, to: string, label?: string, type?: 'yes'|'no'|'default'})

CRITICAL RULES:
- DO NOT truncate content - this is a scrollable webpage, not slides with space constraints
- DO preserve all detail from the outline - include everything meaningful
- DO break very long sections into multiple sections for readability (max 7-8 bullets per content section)
- DO identify data that should be visualized (numbers → data-highlight, comparisons → comparison, workflows → process-flow)
- DO use appropriate section types for different content
- DO maintain visual hierarchy and logical flow
- DO use Google brand colors: Blue #4285F4, Red #EA4335, Yellow #FBBC04, Green #34A853
- DO start with a hero section
- DO use divider sections between major presentation parts

EXAMPLES:

Hero section:
{
  "id": 1,
  "type": "hero",
  "title": "Google Nest Pro Channel Development",
  "subtitle": "Leadership Team Presentation - Q1 2025",
  "background": "#4285F4"
}

Data highlight section:
{
  "id": 5,
  "type": "data-highlight",
  "title": "Market Opportunity",
  "metrics": [
    {"value": "17,000+", "label": "Residential Builders"},
    {"value": "60,000+", "label": "Professional Contractors"},
    {"value": "77,000+", "label": "Total Addressable Market"}
  ],
  "accent": "#34A853"
}

Comparison section:
{
  "id": 8,
  "type": "comparison",
  "title": "Efficiency Gains",
  "leftContent": "Manual research: 30-45 minutes per lead\nManual capacity: 20-30 leads per week\nAd-hoc follow-up tracking\nScattered notes for handoffs",
  "rightContent": "AI enrichment: 2 minutes per lead\nAutomated capacity: 200+ leads per week\nSystematic 100% follow-up\nComplete handoff context",
  "accent": "#34A853"
}

Process flow section:
{
  "id": 12,
  "type": "process-flow",
  "title": "6-Stage Operational Flow",
  "items": [
    {"title": "Lead Identification", "description": "AI enrichment from LinkedIn, permits, trade associations"},
    {"title": "Automated Scoring", "description": "0-100 point scoring across firmographic, digital, contact quality"},
    {"title": "Targeted Outreach", "description": "Multi-touch sequences via Apollo.ai with segment-specific messaging"},
    {"title": "Internal Handoff", "description": "Complete profile to ASM/RSM/SPM with engagement history"},
    {"title": "Partner Coordination", "description": "Nest Pro partner matching and pilot program setup"},
    {"title": "Success Tracking", "description": "Pipeline metrics and continuous optimization"}
  ]
}

Timeline section:
{
  "id": 20,
  "type": "timeline",
  "title": "Roadmap",
  "timeline": [
    {"date": "Q1 2025", "title": "Scale to 100 Campaigns", "description": "Expand across all 15 segments, build messaging library"},
    {"date": "Q2 2025", "title": "500 Active Campaigns", "description": "Phase 1 automation, pilot program standardization"},
    {"date": "Q3-Q4 2025", "title": "Full Market Coverage", "description": "77,000 companies enriched, predictive analytics"}
  ]
}

Multi-column section:
{
  "id": 15,
  "type": "multi-column",
  "title": "7 Builder Segments",
  "columns": [
    {
      "title": "Production/Tract (40%)",
      "items": ["100-1,000+ homes/year", "Standardized communities", "Value: Differentiate with smart home"]
    },
    {
      "title": "Regional Mid-Volume (25%)",
      "items": ["25-100 homes/year", "Semi-custom, design centers", "Value: Smart home customization"]
    },
    {
      "title": "Luxury Custom (8%)",
      "items": ["5-25 homes/year", "$1M+ fully custom", "Value: Premium smart integration"]
    }
  ]
}

Question board section:
{
  "id": 25,
  "type": "question-board",
  "title": "Discussion & Questions",
  "questions": [
    "What am I missing?",
    "What concerns do you have about adoption?",
    "What segment-specific insights should inform Q1 direction?",
    "Who has the best success stories for case studies?",
    "What other cross-functional opportunities should we explore?"
  ],
  "accent": "#4285F4"
}

Flowchart section (for workflows with decision branches):
{
  "id": 15,
  "type": "flowchart",
  "title": "6-Stage Operational Flow",
  "flowchartNodes": [
    {"id": "1", "label": "Lead Identification & AI Enrichment", "description": "2 min/lead via LinkedIn, permits, trade associations", "type": "start", "color": "#4285F4"},
    {"id": "2", "label": "Automated Scoring & Segmentation", "description": "P1/P2/P3 assignment (0-100 points)", "type": "process", "color": "#34A853"},
    {"id": "3", "label": "Targeted Outreach via Apollo.ai", "description": "Segment-specific sequences", "type": "process", "color": "#FBBC04"},
    {"id": "4", "label": "Lead Opens Email?", "description": "Check engagement response", "type": "decision", "color": "#EA4335"},
    {"id": "5a", "label": "Manual Follow-up", "description": "Phone call or Google email", "type": "process", "color": "#34A853"},
    {"id": "5b", "label": "Return to Funnel", "description": "Different sequence later", "type": "process", "color": "#FBBC04"},
    {"id": "6", "label": "Internal Handoff", "description": "ASM/RSM/SPM with complete context", "type": "process", "color": "#4285F4"},
    {"id": "7", "label": "Success Tracking & Optimization", "description": "Apollo analytics + CRM tracking", "type": "end", "color": "#34A853"}
  ],
  "flowchartConnections": [
    {"from": "4", "to": "5a", "label": "Opens/Engages", "type": "yes"},
    {"from": "4", "to": "5b", "label": "No Response", "type": "no"}
  ]
}

CRITICAL OUTPUT FORMAT:
Return ONLY raw JSON. DO NOT wrap in markdown code blocks. DO NOT use \`\`\`json.
Return the JSON object directly:

{
  "sections": [
    { section objects here }
  ]
}`;

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: outline }
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', message: 'Too many AI requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Payment required', message: 'AI service requires payment setup.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;

    // Parse JSON from AI response - handle markdown code blocks
    let sections;
    try {
      let jsonStr = aiContent;
      
      // Remove markdown code blocks if present
      if (jsonStr.includes('```')) {
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1];
        } else {
          // Try to extract JSON without code blocks
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          jsonStr = jsonMatch ? jsonMatch[0] : jsonStr;
        }
      }
      
      const parsed = JSON.parse(jsonStr);
      sections = parsed.sections || [];
      
      // Server-side sanitization to prevent XSS
      sections = sections.map((section: any) => {
        const sanitized: any = { ...section };
        
        // Sanitize text fields by removing HTML tags
        const stripHtml = (text: string) => {
          if (!text) return text;
          return text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        };
        
        if (sanitized.title) sanitized.title = stripHtml(sanitized.title);
        if (sanitized.subtitle) sanitized.subtitle = stripHtml(sanitized.subtitle);
        if (sanitized.content) sanitized.content = stripHtml(sanitized.content);
        if (sanitized.leftContent) sanitized.leftContent = stripHtml(sanitized.leftContent);
        if (sanitized.rightContent) sanitized.rightContent = stripHtml(sanitized.rightContent);
        
        if (sanitized.bullets && Array.isArray(sanitized.bullets)) {
          sanitized.bullets = sanitized.bullets.map(stripHtml);
        }
        
        if (sanitized.questions && Array.isArray(sanitized.questions)) {
          sanitized.questions = sanitized.questions.map(stripHtml);
        }
        
        if (sanitized.items && Array.isArray(sanitized.items)) {
          sanitized.items = sanitized.items.map((item: any) => ({
            ...item,
            title: stripHtml(item.title || ''),
            description: stripHtml(item.description || '')
          }));
        }
        
        if (sanitized.columns && Array.isArray(sanitized.columns)) {
          sanitized.columns = sanitized.columns.map((col: any) => ({
            ...col,
            title: stripHtml(col.title || ''),
            items: col.items ? col.items.map(stripHtml) : []
          }));
        }
        
        if (sanitized.flowchartNodes && Array.isArray(sanitized.flowchartNodes)) {
          sanitized.flowchartNodes = sanitized.flowchartNodes.map((node: any) => ({
            ...node,
            label: stripHtml(node.label || ''),
            description: stripHtml(node.description || '')
          }));
        }
        
        if (sanitized.flowchartConnections && Array.isArray(sanitized.flowchartConnections)) {
          sanitized.flowchartConnections = sanitized.flowchartConnections.map((conn: any) => ({
            ...conn,
            label: stripHtml(conn.label || '')
          }));
        }
        
        return sanitized;
      });
      
    } catch (parseError) {
      console.error('[AI Generate] Failed to parse AI response:', parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store conversation history
    const conversation = [
      { role: 'user', content: outline },
      { role: 'assistant', content: aiContent }
    ];

    return new Response(
      JSON.stringify({ slides: sections, conversation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ai-generate-presentation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});