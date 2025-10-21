import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], images = [] } = await req.json();
    
    if (!message && images.length === 0) {
      throw new Error("Message or image is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing error help request:", message);

    // Build messages array with system prompt and conversation history
    const messages = [
      {
        role: "system",
        content: `You are a helpful technical support assistant for a CRM application. Your role is to:
- Explain error messages in simple, clear language
- Analyze error screenshots and identify issues
- Provide step-by-step troubleshooting guidance
- Suggest common solutions for database, authentication, and UI issues
- Help users understand what went wrong and how to fix it
- Be concise but thorough in your explanations
- Use friendly, supportive language

When explaining errors:
1. Start with a simple explanation of what the error means
2. Explain the likely cause
3. Provide clear steps to resolve it
4. Suggest preventive measures if applicable

Keep responses focused and actionable. If you're unsure, be honest and suggest where to find more help.`
      },
      ...conversationHistory,
      {
        role: "user",
        content: images.length > 0 
          ? [
              ...(message ? [{ type: "text", text: message }] : []),
              ...images.map((img: string) => ({
                type: "image_url",
                image_url: { url: img }
              }))
            ]
          : message
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please wait a moment and try again." 
          }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI credits exhausted. Please add credits to your Lovable workspace in Settings → Workspace → Usage." 
          }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    console.log("AI response generated successfully");

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-error-helper:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
