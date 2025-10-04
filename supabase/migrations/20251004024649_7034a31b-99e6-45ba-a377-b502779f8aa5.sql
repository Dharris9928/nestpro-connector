-- Add contact_id to company_communications and update indexes
ALTER TABLE public.company_communications
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Add index for contact lookups
CREATE INDEX IF NOT EXISTS idx_company_communications_contact ON public.company_communications(contact_id);

-- Add attempted_at column for tracking outreach attempts
ALTER TABLE public.company_communications
ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMP WITH TIME ZONE;