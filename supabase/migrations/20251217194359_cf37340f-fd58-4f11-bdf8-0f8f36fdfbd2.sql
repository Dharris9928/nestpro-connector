-- Add new columns to opportunities table
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS distributor text,
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS sales_personnel_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;