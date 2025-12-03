import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

// Simple PDF text extraction without heavy dependencies
// Extracts text from PDF streams - handles most standard PDFs
function extractTextFromPDF(data: Uint8Array): string {
  const text: string[] = [];
  const decoder = new TextDecoder('latin1');
  const pdfContent = decoder.decode(data);
  
  // Find all text streams in the PDF
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
  let match;
  
  while ((match = streamRegex.exec(pdfContent)) !== null) {
    const streamContent = match[1];
    
    // Try to extract text from BT...ET blocks (text objects)
    const textBlockRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let textMatch;
    
    while ((textMatch = textBlockRegex.exec(streamContent)) !== null) {
      const textBlock = textMatch[1];
      
      // Extract text from Tj and TJ operators
      // Tj: (text) Tj
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(textBlock)) !== null) {
        const extractedText = cleanPDFText(tjMatch[1]);
        if (extractedText.trim()) {
          text.push(extractedText);
        }
      }
      
      // TJ: [(text) num (text)] TJ - array of text and positioning
      const tjArrayRegex = /\[((?:[^[\]]*|\([^)]*\))*)\]\s*TJ/gi;
      let tjArrayMatch;
      while ((tjArrayMatch = tjArrayRegex.exec(textBlock)) !== null) {
        const arrayContent = tjArrayMatch[1];
        const textParts = arrayContent.match(/\(([^)]*)\)/g);
        if (textParts) {
          const combined = textParts
            .map(p => cleanPDFText(p.slice(1, -1)))
            .join('');
          if (combined.trim()) {
            text.push(combined);
          }
        }
      }
    }
  }
  
  // Also try to find plain text content
  const plainTextRegex = /\/Type\s*\/Page[\s\S]*?\/Contents/g;
  
  // Clean up and join
  const result = text
    .filter(t => t.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return result;
}

function cleanPDFText(text: string): string {
  return text
    // Handle octal escapes
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    // Handle hex escapes
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Handle common escapes
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    // Remove other escape sequences
    .replace(/\\./g, '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // Validate file presence
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate file is actually a File object
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file upload' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'File must be a PDF' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate file size
    if (file.size > MAX_PDF_SIZE) {
      return new Response(
        JSON.stringify({ error: 'PDF file too large (max 10MB)' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate file has content
    if (file.size === 0) {
      return new Response(
        JSON.stringify({ error: 'PDF file is empty' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Extract text using our simple parser
    const extractedText = extractTextFromPDF(uint8Array);
    
    if (!extractedText || extractedText.length < 10) {
      // If simple extraction fails, return a message suggesting manual entry
      return new Response(
        JSON.stringify({ 
          text: '',
          pageCount: 0,
          message: 'Could not extract text from this PDF. The PDF may be image-based or use complex formatting. Please enter the content manually.'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        text: extractedText,
        pageCount: 1 // We can't easily count pages with simple extraction
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // Log detailed error server-side only
    console.error('PDF parsing error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Failed to parse PDF. Please ensure the file is a valid PDF and try again.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
