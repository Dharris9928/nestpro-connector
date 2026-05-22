import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType, fileName } = await req.json();
    if (!fileBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: "fileBase64 and mimeType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const dataUrl = `data:${mimeType};base64,${fileBase64}`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at extracting structured data from Purchase Order documents. Return only data visible in the document. If a field is not present, return null for that field. Be precise with numbers and dates.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract Purchase Order information from this document${fileName ? ` (filename: ${fileName})` : ""}. Use the extract_po tool to return the structured data.`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_po",
            description: "Return structured PO fields extracted from the document.",
            parameters: {
              type: "object",
              properties: {
                po_number: { type: ["string", "null"], description: "Purchase Order number / PO #" },
                po_date: { type: ["string", "null"], description: "PO issue date in YYYY-MM-DD format" },
                total_amount: { type: ["number", "null"], description: "Total amount of the PO in dollars" },
                vendor_name: { type: ["string", "null"], description: "Vendor / supplier company name" },
                customer_name: { type: ["string", "null"], description: "Buyer / customer company name" },
                ship_to: { type: ["string", "null"], description: "Ship-to address or location" },
                notes: { type: ["string", "null"], description: "Other notable info (terms, project, job name)" },
              },
              required: ["po_number"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_po" } },
    };

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    let extracted: any = {};
    if (args) {
      try {
        extracted = typeof args === "string" ? JSON.parse(args) : args;
      } catch (e) {
        console.error("Failed to parse tool args", e);
      }
    }

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("extract-po-info error:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
