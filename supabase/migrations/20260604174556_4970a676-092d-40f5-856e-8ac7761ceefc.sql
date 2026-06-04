CREATE OR REPLACE FUNCTION public.auto_assign_priority_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- v2.1 thresholds (lowered 2026-06): widen P3 floor so contractors with
  -- partial enrichment data still get a tier instead of pooling at Unscored.
  IF NEW.lead_score >= 70 THEN
    NEW.priority_tier := 'P1';
  ELSIF NEW.lead_score >= 45 THEN
    NEW.priority_tier := 'P2';
  ELSIF NEW.lead_score >= 20 THEN
    NEW.priority_tier := 'P3';
  ELSE
    NEW.priority_tier := 'Unscored';
  END IF;

  NEW.score_calculated_at := NOW();
  RETURN NEW;
END;
$function$;