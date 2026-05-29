// Shared helper to authenticate cron-triggered edge functions.
// Accepts the request if either:
//   - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>   (used by pg_cron)
//   - x-cron-secret: <CRON_SECRET>                        (used by external schedulers)
// Returns null if authorized, or a 401 Response otherwise.

export function verifyCronRequest(req: Request, corsHeaders: Record<string, string>): Response | null {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = req.headers.get("x-cron-secret") ?? "";

  const okService = !!serviceRoleKey && bearer === serviceRoleKey;
  const okCron = !!cronSecret && headerSecret === cronSecret;

  if (okService || okCron) return null;

  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
