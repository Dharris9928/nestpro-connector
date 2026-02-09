
-- Add column to track external sales rep assignment on opportunities
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS assigned_to_sales_rep_id UUID REFERENCES public.sales_reps(id);
