
-- Add comments column to job_quotes
ALTER TABLE public.job_quotes ADD COLUMN IF NOT EXISTS comments text;

-- Create job_quote_products table for multiple product line items
CREATE TABLE public.job_quote_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_quote_id UUID NOT NULL REFERENCES public.job_quotes(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_quote_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_quote_products
CREATE POLICY "Users can view job quote products" ON public.job_quote_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_quotes jq
      WHERE jq.id = job_quote_id
      AND (jq.created_by = auth.uid() OR has_elevated_access(auth.uid()))
    )
  );

CREATE POLICY "Users can insert job quote products" ON public.job_quote_products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_quotes jq
      WHERE jq.id = job_quote_id
      AND (jq.created_by = auth.uid() OR has_elevated_access(auth.uid()))
    )
  );

CREATE POLICY "Users can update job quote products" ON public.job_quote_products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.job_quotes jq
      WHERE jq.id = job_quote_id
      AND (jq.created_by = auth.uid() OR has_elevated_access(auth.uid()))
    )
  );

CREATE POLICY "Users can delete job quote products" ON public.job_quote_products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.job_quotes jq
      WHERE jq.id = job_quote_id
      AND (jq.created_by = auth.uid() OR has_elevated_access(auth.uid()))
    )
  );
