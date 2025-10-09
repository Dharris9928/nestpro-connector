-- Create sales_reps table for non-user sales personnel
CREATE TABLE public.sales_reps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  territory TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create unique constraint on email
CREATE UNIQUE INDEX idx_sales_reps_email ON public.sales_reps(email);

-- Enable Row Level Security
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_reps table

-- All authenticated users can view sales reps
CREATE POLICY "All authenticated users can view sales reps"
ON public.sales_reps
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Elevated users can create sales reps
CREATE POLICY "Elevated users can create sales reps"
ON public.sales_reps
FOR INSERT
WITH CHECK (has_elevated_access(auth.uid()));

-- Elevated users can update sales reps
CREATE POLICY "Elevated users can update sales reps"
ON public.sales_reps
FOR UPDATE
USING (has_elevated_access(auth.uid()));

-- Only admins can delete sales reps
CREATE POLICY "Only admins can delete sales reps"
ON public.sales_reps
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_sales_reps_updated_at
BEFORE UPDATE ON public.sales_reps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();