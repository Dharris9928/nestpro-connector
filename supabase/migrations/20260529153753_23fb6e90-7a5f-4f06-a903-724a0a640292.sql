-- Fix cron jobs that were calling enrichment edge functions with the anon key
-- (verifyCronRequest was rejecting them with 401, so nothing ran or logged).
-- Switch them to use the service role key stored in vault.

SELECT cron.unschedule(6);
SELECT cron.unschedule(5);

SELECT cron.schedule(
  'bulk-enrich-cron',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fjajupvwitxipzatmmss.supabase.co/functions/v1/bulk-enrich-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'enrichment-backfill-runner',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fjajupvwitxipzatmmss.supabase.co/functions/v1/automation-runner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{"flow":"enrichment_backfill"}'::jsonb
  );
  $$
);