-- Create table for business context notes
CREATE TABLE public.business_context_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_description TEXT,
  team_mission TEXT,
  value_proposition TEXT,
  target_customer_profile TEXT,
  key_products_services TEXT,
  communication_guidelines TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_context_settings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view business context
CREATE POLICY "All authenticated users can view business context"
ON public.business_context_settings
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can insert business context
CREATE POLICY "Only admins can insert business context"
ON public.business_context_settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy: Only admins can update business context
CREATE POLICY "Only admins can update business context"
ON public.business_context_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy: Only admins can delete business context
CREATE POLICY "Only admins can delete business context"
ON public.business_context_settings
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Insert default record (will be updated by admins)
INSERT INTO public.business_context_settings (
  business_description,
  team_mission,
  value_proposition,
  target_customer_profile,
  key_products_services,
  communication_guidelines
) VALUES (
  'Your business description here',
  'Your team mission and goals here',
  'Your unique value proposition here',
  'Description of your target customers here',
  'Key products and services you offer here',
  'Communication style and guidelines here'
);

-- Add trigger to update timestamp
CREATE TRIGGER update_business_context_settings_updated_at
BEFORE UPDATE ON public.business_context_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.business_context_settings IS 'Stores permanent business context notes to help AI generate better communications';
