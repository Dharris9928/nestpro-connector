-- Add optional PO number field to job_quotes for tracking purchase orders when quotes are won
ALTER TABLE public.job_quotes ADD COLUMN po_number text;

-- Add index for quick lookup by PO number
CREATE INDEX idx_job_quotes_po_number ON public.job_quotes(po_number);