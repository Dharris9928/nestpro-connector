# Safely downsize Lovable Cloud compute

## Why
- Current instance: **compute large** (~28 credits/month, 21% of your spend).
- Real load: 6/160 connections, 39% memory, 1/800 pool clients. Wildly over-provisioned.
- But: the bulk-enrich cron is doing full table scans on `companies` (top query: 1,013 calls × 1.5s avg). Those scans currently hide behind spare CPU. If we shrink compute first, they'll become user-visible slowness.

So: **fix the scans first, then downsize.**

## Step 1 — Add indexes the cron actually needs
One migration, plain `CREATE INDEX` (concurrent isn't allowed in migrations). Targets the exact filter combos seen in `slow_queries`:

```sql
-- Cron's main "needs enrichment" filter
CREATE INDEX IF NOT EXISTS idx_companies_enrichment_pending
  ON public.companies (last_enrichment_attempt_at)
  WHERE builder_segment IS NULL
    AND segment IS NULL
    AND enrichment_skip_reason IS NULL;

-- "Has website" variant the cron also runs
CREATE INDEX IF NOT EXISTS idx_companies_enrichment_pending_with_site
  ON public.companies (id)
  WHERE builder_segment IS NULL
    AND segment IS NULL
    AND enrichment_skip_reason IS NULL
    AND website_url IS NOT NULL
    AND website_url <> '';

-- Generic builder_segment lookup (used by analytics + cron)
CREATE INDEX IF NOT EXISTS idx_companies_builder_segment_null
  ON public.companies (id)
  WHERE builder_segment IS NULL;
```

Partial indexes — small footprint, won't bloat the 3.84 GB DB.

## Step 2 — Verify the indexes are used
Run `EXPLAIN (ANALYZE, BUFFERS)` on the two top offenders. Confirm `Index Scan` (not `Seq Scan`) and that mean time drops from ~1,500 ms to under ~50 ms.

## Step 3 — Quiet the cron noise
The bulk-enrich cron is firing every ~60 seconds (visible in edge function logs — boot/shutdown every minute). Stretch it to every 5 minutes in `supabase/config.toml`. Enrichment is not a sub-minute requirement, and this alone removes ~80% of repeat scans.

## Step 4 — Downsize compute
Two safe options:

- **Aggressive (recommended)**: `large` → `small`. Saves ~22 credits/month. Headroom check: peak connections 6, peak memory 39% — both fit small comfortably.
- **Conservative**: `large` → `medium`. Saves ~12 credits/month. Use if you'd rather watch one tier at a time.

User does this manually: **Cloud → Overview → Advanced settings → change instance size.** Resize takes a few minutes and the DB is briefly unavailable.

## Step 5 — Monitor for 48 hours
Re-check `db_health` afterward. Watch memory, connections, OOM kills. If memory > 75% sustained or any OOM kill appears, bump back up one tier. Easy to reverse.

## Step 6 — Stop the bleeding regardless of compute
Set credit alerts so this can't sneak up again:
- **Settings → Plans & Credits → Alerts & limits**
- Notify at 75% and 90%
- Optional block at 100% (build pauses instead of overflowing)

## What this should save
- Compute downsize: ~22 credits / month (large → small)
- Cron slowdown + indexes: removes a multi-hour/day CPU sink (indirect — lets small actually hold up)
- Combined: brings the Cloud-compute share of your bill from ~21% to ~5%

## Out of scope (intentionally)
- Data disk: leave at current size, 65% is fine.
- AI Gateway: 0.0007 credits last week, ignore.
- Build/Plan mode credits (74% of spend): behavior change on your side, not a code fix.
