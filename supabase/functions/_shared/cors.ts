const ALLOWED_ORIGINS = [
  'https://nestproconnector.lovable.app',
  'https://id-preview--fecf655d-278f-48e9-a0cd-40927fe3377c.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Returns CORS headers scoped to allowed origins.
 * If no origin header is present (e.g. server-to-server), allows the request.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
    };
  }

  // No origin header (server-to-server / curl) – allow without CORS
  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    };
  }

  // Unknown browser origin – deny
  return {
    'Access-Control-Allow-Origin': 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

/** @deprecated Use getCorsHeaders(req) instead */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
