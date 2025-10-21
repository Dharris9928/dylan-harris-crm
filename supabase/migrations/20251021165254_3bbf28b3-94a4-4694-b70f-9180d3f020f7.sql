-- Create junction tables for many-to-many relationships between activities/communications/opportunities and contacts

-- Junction table for activity-contact relationships
CREATE TABLE IF NOT EXISTS public.activity_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.outreach_activities(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(activity_id, contact_id)
);

-- Junction table for communication-contact relationships
CREATE TABLE IF NOT EXISTS public.communication_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_id UUID NOT NULL REFERENCES public.company_communications(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(communication_id, contact_id)
);

-- Junction table for opportunity-contact relationships (optional)
CREATE TABLE IF NOT EXISTS public.opportunity_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(opportunity_id, contact_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_contacts_activity_id ON public.activity_contacts(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_contacts_contact_id ON public.activity_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_communication_contacts_communication_id ON public.communication_contacts(communication_id);
CREATE INDEX IF NOT EXISTS idx_communication_contacts_contact_id ON public.communication_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_contacts_opportunity_id ON public.opportunity_contacts(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_contacts_contact_id ON public.opportunity_contacts(contact_id);

-- Migrate existing single contact relationships to junction tables
-- For activities
INSERT INTO public.activity_contacts (activity_id, contact_id)
SELECT id, contact_id 
FROM public.outreach_activities 
WHERE contact_id IS NOT NULL
ON CONFLICT (activity_id, contact_id) DO NOTHING;

-- For communications
INSERT INTO public.communication_contacts (communication_id, contact_id)
SELECT id, contact_id 
FROM public.company_communications 
WHERE contact_id IS NOT NULL
ON CONFLICT (communication_id, contact_id) DO NOTHING;

-- Enable RLS on junction tables
ALTER TABLE public.activity_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_contacts
CREATE POLICY "Users can view activity contacts for their activities"
  ON public.activity_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.outreach_activities a
      WHERE a.id = activity_contacts.activity_id
      AND (has_elevated_access(auth.uid()) OR a.created_by = auth.uid() OR a.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Users can manage activity contacts for their activities"
  ON public.activity_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.outreach_activities a
      WHERE a.id = activity_contacts.activity_id
      AND (has_elevated_access(auth.uid()) OR a.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.outreach_activities a
      WHERE a.id = activity_contacts.activity_id
      AND (has_elevated_access(auth.uid()) OR a.created_by = auth.uid())
    )
  );

-- RLS policies for communication_contacts
CREATE POLICY "Users can view communication contacts for their communications"
  ON public.communication_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_communications c
      WHERE c.id = communication_contacts.communication_id
      AND (has_elevated_access(auth.uid()) OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage communication contacts for their communications"
  ON public.communication_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_communications c
      WHERE c.id = communication_contacts.communication_id
      AND (has_elevated_access(auth.uid()) OR c.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_communications c
      WHERE c.id = communication_contacts.communication_id
      AND (has_elevated_access(auth.uid()) OR c.user_id = auth.uid())
    )
  );

-- RLS policies for opportunity_contacts
CREATE POLICY "Users can view opportunity contacts for their opportunities"
  ON public.opportunity_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = opportunity_contacts.opportunity_id
      AND (has_elevated_access(auth.uid()) OR o.created_by = auth.uid() OR o.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Users can manage opportunity contacts for their opportunities"
  ON public.opportunity_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = opportunity_contacts.opportunity_id
      AND (has_elevated_access(auth.uid()) OR o.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = opportunity_contacts.opportunity_id
      AND (has_elevated_access(auth.uid()) OR o.created_by = auth.uid())
    )
  );