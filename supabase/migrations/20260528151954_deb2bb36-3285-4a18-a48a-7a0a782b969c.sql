
-- Panic button: forces all automation rules into dry_run mode
CREATE OR REPLACE FUNCTION public.disable_all_automation(reason text DEFAULT 'Manual panic disable')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can disable automation';
  END IF;

  UPDATE public.automation_rules
  SET mode = 'dry_run',
      flagged_for_review = true,
      flagged_reason = reason,
      updated_at = now()
  WHERE mode <> 'dry_run' OR flagged_for_review = false;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  INSERT INTO public.automation_runs (
    rule_key, status, mode, started_at, finished_at,
    result_payload, flagged_for_review
  ) VALUES (
    'PANIC_DISABLE', 'success', 'dry_run', now(), now(),
    jsonb_build_object('reason', reason, 'rules_affected', affected_count, 'actor', auth.uid()),
    true
  );

  RETURN affected_count;
END;
$$;

-- Re-enable a single rule with a specific mode (dry_run | live)
CREATE OR REPLACE FUNCTION public.enable_automation_rule(_rule_key text, _mode text DEFAULT 'dry_run')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can enable automation rules';
  END IF;

  IF _mode NOT IN ('dry_run', 'live') THEN
    RAISE EXCEPTION 'Invalid mode: must be dry_run or live';
  END IF;

  UPDATE public.automation_rules
  SET mode = _mode,
      flagged_for_review = false,
      flagged_reason = NULL,
      updated_at = now()
  WHERE rule_key = _rule_key;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.disable_all_automation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enable_automation_rule(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_all_automation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enable_automation_rule(text, text) TO authenticated;
