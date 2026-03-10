-- Drop the old function first (different return type)
DROP FUNCTION IF EXISTS public.cleanup_old_records();

-- Add whitelist constraints
ALTER TABLE public.data_retention_policies
DROP CONSTRAINT IF EXISTS check_table_name_whitelist;

ALTER TABLE public.data_retention_policies
ADD CONSTRAINT check_table_name_whitelist
CHECK (table_name IN (
  'contact_access_logs', 'approval_audit_log', 'enrichment_logs',
  'encryption_audit_log', 'auth_events_log', 'api_audit_log',
  'export_logs', 'email_logs', 'bulk_access_alerts',
  'blocked_signup_attempts', 'sync_logs', 'ai_usage_logs',
  'import_export_logs', 'audit_logs', 'user_sessions'
));

ALTER TABLE public.data_retention_policies
DROP CONSTRAINT IF EXISTS check_date_column_format;

ALTER TABLE public.data_retention_policies
ADD CONSTRAINT check_date_column_format
CHECK (date_column ~ '^[a-z_]+$');

-- Recreate with hardened logic
CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS TABLE(table_cleaned text, rows_deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  policy_record RECORD;
  deleted_count BIGINT;
BEGIN
  FOR policy_record IN
    SELECT * FROM public.data_retention_policies
    WHERE enabled = true
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND information_schema.tables.table_name = policy_record.table_name
    ) THEN
      RAISE WARNING 'Retention policy references non-existent table: %', policy_record.table_name;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND information_schema.columns.table_name = policy_record.table_name
      AND information_schema.columns.column_name = policy_record.date_column
    ) THEN
      RAISE WARNING 'Retention policy references non-existent column % on table %',
        policy_record.date_column, policy_record.table_name;
      CONTINUE;
    END IF;

    EXECUTE format(
      'DELETE FROM public.%I WHERE %I < now() - interval ''%s days''',
      policy_record.table_name,
      policy_record.date_column,
      policy_record.retention_days
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    UPDATE public.data_retention_policies
    SET last_cleanup_at = now()
    WHERE id = policy_record.id;

    table_cleaned := policy_record.table_name;
    rows_deleted := deleted_count;
    RETURN NEXT;
  END LOOP;
END;
$$;
