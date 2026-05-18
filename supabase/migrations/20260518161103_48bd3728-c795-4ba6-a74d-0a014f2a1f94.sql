ALTER TABLE public.sales_reps
  ADD COLUMN IF NOT EXISTS covered_states text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_firm boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sales_reps_covered_states
  ON public.sales_reps USING GIN (covered_states);