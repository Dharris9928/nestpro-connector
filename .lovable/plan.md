

## Problem

The "Add User" edge function (`admin-create-user`) is failing with a non-2xx status code. Two issues identified:

1. **Missing custom domain in CORS allowlist** — The app is being accessed from `https://nestproconnector.com` (visible in auth logs), but this domain is not in the `ALLOWED_ORIGINS` array in `supabase/functions/_shared/cors.ts`. While `admin-create-user` currently uses the deprecated wildcard `corsHeaders`, other functions called during the same session may fail, and the function itself should be migrated.

2. **`admin-create-user` uses deprecated CORS** — It imports the old `corsHeaders` constant instead of `getCorsHeaders(req)`, which bypasses the origin validation security hardening.

## Fix Plan

### 1. Add `nestproconnector.com` to CORS allowlist
Add `https://nestproconnector.com` and `https://www.nestproconnector.com` to the `ALLOWED_ORIGINS` array in `supabase/functions/_shared/cors.ts`.

### 2. Migrate `admin-create-user` to use `getCorsHeaders(req)`
- Replace `import { corsHeaders }` with `import { getCorsHeaders }`
- Replace all `corsHeaders` references with `getCorsHeaders(req)` calls
- This aligns with the security hardening already applied to other functions

### 3. Redeploy both functions
Deploy the updated CORS module and `admin-create-user` function, then test to confirm user creation works.

