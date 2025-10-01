-- ==================================================
-- VIEW SYSTEM TABLES
-- ==================================================

-- Store view configurations
CREATE TABLE IF NOT EXISTS public.saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  view_name TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (
    view_type IN ('grid', 'kanban', 'calendar', 'gallery', 'list', 'form', 'timeline', 'gantt')
  ),
  table_name TEXT NOT NULL, -- Which table this view is for
  
  -- View configuration (JSON)
  configuration JSONB, -- Stores filters, sorts, hidden fields, colors, etc.
  
  -- View permissions
  view_permission_type TEXT DEFAULT 'collaborative' CHECK (
    view_permission_type IN ('collaborative', 'personal', 'locked')
  ),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_favorite BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  
  -- View section organization
  view_section TEXT, -- 'My Views', 'All Views', custom sections
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_views
CREATE POLICY "Users can view collaborative and their own views"
  ON public.saved_views FOR SELECT
  USING (
    view_permission_type = 'collaborative' 
    OR created_by = auth.uid()
    OR has_elevated_access(auth.uid())
  );

CREATE POLICY "Users can create their own views"
  ON public.saved_views FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own views or collaborative views"
  ON public.saved_views FOR UPDATE
  USING (
    created_by = auth.uid() 
    OR (view_permission_type = 'collaborative' AND view_permission_type != 'locked')
    OR has_elevated_access(auth.uid())
  );

CREATE POLICY "Users can delete their own views"
  ON public.saved_views FOR DELETE
  USING (created_by = auth.uid() OR has_elevated_access(auth.uid()));

-- Store user-specific view preferences
CREATE TABLE IF NOT EXISTS public.user_view_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_view_id UUID REFERENCES public.saved_views(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  last_accessed TIMESTAMP WITH TIME ZONE,
  custom_configuration JSONB, -- User-specific overrides
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, saved_view_id)
);

-- Enable RLS
ALTER TABLE public.user_view_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_view_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_view_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences"
  ON public.user_view_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.user_view_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own preferences"
  ON public.user_view_preferences FOR DELETE
  USING (user_id = auth.uid());

-- Add missing fields to existing outreach_activities table
ALTER TABLE public.outreach_activities 
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Scheduled' CHECK (
    status IN ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled')
  ),
  ADD COLUMN IF NOT EXISTS next_action TEXT;

-- Add missing fields to existing pilot_programs table
ALTER TABLE public.pilot_programs 
  ADD COLUMN IF NOT EXISTS pilot_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS actual_end_date DATE;

-- Add company logo field for Gallery view
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS company_logo TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_views_table ON public.saved_views(table_name);
CREATE INDEX IF NOT EXISTS idx_saved_views_type ON public.saved_views(view_type);
CREATE INDEX IF NOT EXISTS idx_saved_views_created_by ON public.saved_views(created_by);
CREATE INDEX IF NOT EXISTS idx_user_view_preferences_user ON public.user_view_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_activities_status ON public.outreach_activities(status);
CREATE INDEX IF NOT EXISTS idx_outreach_activities_assigned ON public.outreach_activities(assigned_to);

-- Create trigger for updated_at on saved_views
CREATE TRIGGER update_saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();