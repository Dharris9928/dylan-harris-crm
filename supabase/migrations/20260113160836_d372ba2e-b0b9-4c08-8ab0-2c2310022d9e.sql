-- Create job_quotes table for tracking job quotes
CREATE TABLE public.job_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT,
  date_received TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_won TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  distributor_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  wholesaler_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  product TEXT,
  quantity INTEGER DEFAULT 1,
  price NUMERIC,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_quote_contacts junction table for multiple contacts with type designation
CREATE TABLE public.job_quote_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_quote_id UUID NOT NULL REFERENCES public.job_quotes(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL DEFAULT 'customer' CHECK (contact_type IN ('wholesale_personnel', 'nest_field_team', 'distributor_personnel', 'customer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_quote_id, contact_id)
);

-- Enable RLS on both tables
ALTER TABLE public.job_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_quote_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_quotes
CREATE POLICY "Users can view their own job quotes"
  ON public.job_quotes FOR SELECT
  USING (
    is_user_approved(auth.uid()) AND 
    (created_by = auth.uid() OR has_elevated_access(auth.uid()))
  );

CREATE POLICY "Users can create job quotes"
  ON public.job_quotes FOR INSERT
  WITH CHECK (
    is_user_approved(auth.uid()) AND 
    created_by = auth.uid()
  );

CREATE POLICY "Users can update their own job quotes"
  ON public.job_quotes FOR UPDATE
  USING (
    is_user_approved(auth.uid()) AND 
    (created_by = auth.uid() OR has_elevated_access(auth.uid()))
  );

CREATE POLICY "Users can delete their own job quotes"
  ON public.job_quotes FOR DELETE
  USING (
    is_user_approved(auth.uid()) AND 
    (created_by = auth.uid() OR has_elevated_access(auth.uid()))
  );

-- RLS policies for job_quote_contacts
CREATE POLICY "Users can view job quote contacts"
  ON public.job_quote_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_quotes jq
      WHERE jq.id = job_quote_id
      AND (jq.created_by = auth.uid() OR has_elevated_access(auth.uid()))
    )
  );

CREATE POLICY "Users can manage job quote contacts"
  ON public.job_quote_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.job_quotes jq
      WHERE jq.id = job_quote_id
      AND (jq.created_by = auth.uid() OR has_elevated_access(auth.uid()))
    )
  );

-- Create trigger for updating updated_at
CREATE TRIGGER update_job_quotes_updated_at
  BEFORE UPDATE ON public.job_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for status filtering and stale quote detection
CREATE INDEX idx_job_quotes_status ON public.job_quotes(status);
CREATE INDEX idx_job_quotes_date_received ON public.job_quotes(date_received);
CREATE INDEX idx_job_quotes_created_by ON public.job_quotes(created_by);

-- Enable realtime for job_quotes
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_quotes;