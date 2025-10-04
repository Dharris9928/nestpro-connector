-- Create table for storing communication history and templates
CREATE TABLE IF NOT EXISTS public.company_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'call_script', 'linkedin_message')),
  subject TEXT,
  content TEXT NOT NULL,
  previous_context TEXT,
  ai_model TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.company_communications ENABLE ROW LEVEL SECURITY;

-- Policies for company_communications
CREATE POLICY "Users can view communications for their companies"
ON public.company_communications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_communications.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create communications for their companies"
ON public.company_communications
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_communications.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update communications for their companies"
ON public.company_communications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_communications.company_id
    AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can delete their communications"
ON public.company_communications
FOR DELETE
USING (
  user_id = auth.uid()
  OR has_elevated_access(auth.uid())
);

-- Create index for better performance
CREATE INDEX idx_company_communications_company ON public.company_communications(company_id);
CREATE INDEX idx_company_communications_user ON public.company_communications(user_id);
CREATE INDEX idx_company_communications_type ON public.company_communications(communication_type);