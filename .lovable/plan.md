## Cloud cost reduction — execute cleanup

Apply a tiered retention policy, run a one-time purge to reclaim ~700–900 MB, and schedule nightly cleanup going forward. No app code changes.

### Retention rules

| Table | Retention | Why |
|---|---|---|
| **audit_logs** | **90 days** | 67% of DB; high-volume mutation log |
| contact_access_logs | 1 year | Compliance |
| bulk_access_alerts | 1 year | Security review |
| enrichment_logs | 1 year | Debugging window |
| auth_events_log | 1 year | Compliance |
| import_export_logs | 1 year | Audit trail |
| encryption_audit_log | 1 year | Compliance |
| perspective_usage_analytics | 1 year | Analytics |
| email_logs | 1 year | Delivery history |
| apollo_email_activities | 1 year | Already <1yr; safety net |
| password_reset_codes | already cleaned by existing function | — |
| user_sessions | already cleaned by existing function | — |

### Steps

1. **Reuse existing `cleanup_old_records()` function** — your DB already has it; it reads from a `data_retention_policies` table and deletes by date column. Populate that table with the rules above (INSERT/UPSERT only — no schema change).
2. **One-time purge** — run `SELECT public.cleanup_old_records();` immediately to delete rows beyond retention. Expect ~230k rows removed from `audit_logs` alone (everything before ~early March 2026).
3. **Reclaim disk** — `VACUUM FULL public.audit_logs;` to physically shrink the table file. Brief table lock (~30–90 sec).
4. **Schedule nightly cleanup** — `pg_cron` job at 03:00 UTC daily calling `cleanup_old_records()`. Keeps growth bounded forever.
5. **Verify** — re-check `pg_total_relation_size('audit_logs')` and overall DB size after vacuum.

### Expected result

- `audit_logs`: 1,107 MB → ~250–350 MB
- Total DB: 1.64 GB → ~700–900 MB
- Ongoing audit growth capped at ~90 days

### Technical notes (for reference)

- `cleanup_old_records()` already exists, is `SECURITY DEFINER`, validates table/column existence, and updates `last_cleanup_at` per policy. No function changes needed.
- `data_retention_policies` rows include `table_name`, `date_column` (`created_at` for all the above), `retention_days`, `enabled`.
- `pg_cron` schedule SQL is inserted via the insert tool (contains project URL + anon key), not the migration tool.
- `VACUUM FULL` cannot run inside a transaction block, so it'll be a separate execution after the purge.
- Storage bucket cleanup skipped — current total is 78 KB, not worth touching.

### What I need from you

Just approve. No secrets, no schema changes, no app downtime. The only user-visible moment is the brief lock during `VACUUM FULL` — I'll run it but flag the timing.
