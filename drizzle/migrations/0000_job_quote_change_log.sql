CREATE TABLE public.job_quote_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_quote_id uuid NOT NULL REFERENCES public.job_quotes(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type IN ('insert','update')),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid
);

GRANT SELECT ON public.job_quote_change_log TO authenticated;
GRANT ALL ON public.job_quote_change_log TO service_role;

ALTER TABLE public.job_quote_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved_users_read_change_log" ON public.job_quote_change_log
  FOR SELECT TO authenticated
  USING (is_user_approved(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_job_quote_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  diff jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.job_quote_change_log (job_quote_id, change_type, changes, changed_by)
    VALUES (NEW.id, 'insert', '{}'::jsonb, auth.uid());
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    diff := diff || jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    diff := diff || jsonb_build_object('price', jsonb_build_object('from', OLD.price, 'to', NEW.price));
  END IF;
  IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    diff := diff || jsonb_build_object('quantity', jsonb_build_object('from', OLD.quantity, 'to', NEW.quantity));
  END IF;
  IF OLD.product IS DISTINCT FROM NEW.product THEN
    diff := diff || jsonb_build_object('product', jsonb_build_object('from', OLD.product, 'to', NEW.product));
  END IF;
  IF OLD.quote_number IS DISTINCT FROM NEW.quote_number THEN
    diff := diff || jsonb_build_object('quote_number', jsonb_build_object('from', OLD.quote_number, 'to', NEW.quote_number));
  END IF;
  IF OLD.assigned_to_sales_rep_id IS DISTINCT FROM NEW.assigned_to_sales_rep_id THEN
    diff := diff || jsonb_build_object('assignee', jsonb_build_object('from', OLD.assigned_to_sales_rep_id, 'to', NEW.assigned_to_sales_rep_id));
  END IF;
  IF OLD.comments IS DISTINCT FROM NEW.comments THEN
    diff := diff || jsonb_build_object('comments', jsonb_build_object('from', 'updated', 'to', 'updated'));
  END IF;

  IF diff <> '{}'::jsonb THEN
    INSERT INTO public.job_quote_change_log (job_quote_id, change_type, changes, changed_by)
    VALUES (NEW.id, 'update', diff, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER job_quote_change_log_trigger
AFTER INSERT OR UPDATE ON public.job_quotes
FOR EACH ROW EXECUTE FUNCTION public.log_job_quote_change();

-- Backfill: mark all existing quotes as inserted at their created_at
INSERT INTO public.job_quote_change_log (job_quote_id, change_type, changes, changed_at)
SELECT id, 'insert', '{}'::jsonb, created_at FROM public.job_quotes;

-- Backfill the two known status corrections from the TSM sheet import
INSERT INTO public.job_quote_change_log (job_quote_id, change_type, changes, changed_at)
SELECT id, 'update', jsonb_build_object('status', jsonb_build_object('from','pending','to','won')), updated_at
FROM public.job_quotes WHERE comments ILIKE '%Alexan%' AND status = 'won';

INSERT INTO public.job_quote_change_log (job_quote_id, change_type, changes, changed_at)
SELECT id, 'update', jsonb_build_object('status', jsonb_build_object('from','won','to','pending')), updated_at
FROM public.job_quotes WHERE quote_number = 'B231497';