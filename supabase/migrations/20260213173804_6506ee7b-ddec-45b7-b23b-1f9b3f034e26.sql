
ALTER TABLE public.job_quotes ADD COLUMN assigned_to uuid REFERENCES public.profiles(id);
ALTER TABLE public.job_quotes ADD COLUMN assigned_to_sales_rep_id uuid;
