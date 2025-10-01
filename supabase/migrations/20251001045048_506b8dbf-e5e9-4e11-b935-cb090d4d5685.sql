-- Fix overly permissive RLS policies across all business data tables
-- Apply consistent company ownership-based access control

-- ========================================
-- 1. BUILDER SCORING DETAILS
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view builder scoring details" ON public.builder_scoring_details;
DROP POLICY IF EXISTS "Authenticated users can insert builder scoring details" ON public.builder_scoring_details;
DROP POLICY IF EXISTS "Authenticated users can update builder scoring details" ON public.builder_scoring_details;
DROP POLICY IF EXISTS "Authenticated users can delete builder scoring details" ON public.builder_scoring_details;

CREATE POLICY "Users can view builder scoring for their companies"
ON public.builder_scoring_details FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = builder_scoring_details.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can insert builder scoring for their companies"
ON public.builder_scoring_details FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = builder_scoring_details.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update builder scoring for their companies"
ON public.builder_scoring_details FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = builder_scoring_details.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Elevated users can delete builder scoring"
ON public.builder_scoring_details FOR DELETE
USING (has_elevated_access(auth.uid()));

-- ========================================
-- 2. CONTRACTOR SCORING DETAILS
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view contractor scoring details" ON public.contractor_scoring_details;
DROP POLICY IF EXISTS "Authenticated users can insert contractor scoring details" ON public.contractor_scoring_details;
DROP POLICY IF EXISTS "Authenticated users can update contractor scoring details" ON public.contractor_scoring_details;
DROP POLICY IF EXISTS "Authenticated users can delete contractor scoring details" ON public.contractor_scoring_details;

CREATE POLICY "Users can view contractor scoring for their companies"
ON public.contractor_scoring_details FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contractor_scoring_details.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can insert contractor scoring for their companies"
ON public.contractor_scoring_details FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contractor_scoring_details.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update contractor scoring for their companies"
ON public.contractor_scoring_details FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = contractor_scoring_details.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Elevated users can delete contractor scoring"
ON public.contractor_scoring_details FOR DELETE
USING (has_elevated_access(auth.uid()));

-- ========================================
-- 3. SEGMENTATION SCORES
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view segmentation scores" ON public.segmentation_scores;
DROP POLICY IF EXISTS "Authenticated users can create segmentation scores" ON public.segmentation_scores;
DROP POLICY IF EXISTS "Authenticated users can update segmentation scores" ON public.segmentation_scores;
DROP POLICY IF EXISTS "Authenticated users can delete segmentation scores" ON public.segmentation_scores;

CREATE POLICY "Users can view segmentation scores for their companies"
ON public.segmentation_scores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = segmentation_scores.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create segmentation scores for their companies"
ON public.segmentation_scores FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = segmentation_scores.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update segmentation scores for their companies"
ON public.segmentation_scores FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = segmentation_scores.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Elevated users can delete segmentation scores"
ON public.segmentation_scores FOR DELETE
USING (has_elevated_access(auth.uid()));

-- ========================================
-- 4. INSTALLATION HISTORY
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view installation history" ON public.installation_history;
DROP POLICY IF EXISTS "Authenticated users can create installation history" ON public.installation_history;
DROP POLICY IF EXISTS "Authenticated users can update installation history" ON public.installation_history;
DROP POLICY IF EXISTS "Authenticated users can delete installation history" ON public.installation_history;

CREATE POLICY "Users can view installations for their companies"
ON public.installation_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = installation_history.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create installations for their companies"
ON public.installation_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = installation_history.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update installations for their companies"
ON public.installation_history FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = installation_history.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Elevated users can delete installations"
ON public.installation_history FOR DELETE
USING (has_elevated_access(auth.uid()));

-- ========================================
-- 5. TRAINING CERTIFICATIONS
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view training certifications" ON public.training_certifications;
DROP POLICY IF EXISTS "Authenticated users can create training certifications" ON public.training_certifications;
DROP POLICY IF EXISTS "Authenticated users can update training certifications" ON public.training_certifications;
DROP POLICY IF EXISTS "Authenticated users can delete training certifications" ON public.training_certifications;

CREATE POLICY "Users can view training for their companies"
ON public.training_certifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = training_certifications.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create training for their companies"
ON public.training_certifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = training_certifications.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update training for their companies"
ON public.training_certifications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = training_certifications.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Elevated users can delete training"
ON public.training_certifications FOR DELETE
USING (has_elevated_access(auth.uid()));

-- ========================================
-- 6. PILOT PROGRAMS
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view pilot programs" ON public.pilot_programs;
DROP POLICY IF EXISTS "Authenticated users can create pilot programs" ON public.pilot_programs;
DROP POLICY IF EXISTS "Authenticated users can update pilot programs" ON public.pilot_programs;
DROP POLICY IF EXISTS "Authenticated users can delete pilot programs" ON public.pilot_programs;

CREATE POLICY "Users can view pilot programs for their companies"
ON public.pilot_programs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = pilot_programs.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create pilot programs for their companies"
ON public.pilot_programs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = pilot_programs.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update pilot programs for their companies"
ON public.pilot_programs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = pilot_programs.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Elevated users can delete pilot programs"
ON public.pilot_programs FOR DELETE
USING (has_elevated_access(auth.uid()));

-- ========================================
-- 7. COMPANY PARTNER MATCHES
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view company partner matches" ON public.company_partner_matches;
DROP POLICY IF EXISTS "Authenticated users can create company partner matches" ON public.company_partner_matches;
DROP POLICY IF EXISTS "Authenticated users can update company partner matches" ON public.company_partner_matches;
DROP POLICY IF EXISTS "Authenticated users can delete company partner matches" ON public.company_partner_matches;

CREATE POLICY "Users can view partner matches for their companies"
ON public.company_partner_matches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_partner_matches.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create partner matches for their companies"
ON public.company_partner_matches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_partner_matches.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update partner matches for their companies"
ON public.company_partner_matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_partner_matches.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Elevated users can delete partner matches"
ON public.company_partner_matches FOR DELETE
USING (has_elevated_access(auth.uid()));

-- ========================================
-- 8. NEST PRO PARTNERS (Admin-only access)
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view nest pro partners" ON public.nest_pro_partners;
DROP POLICY IF EXISTS "Authenticated users can create nest pro partners" ON public.nest_pro_partners;
DROP POLICY IF EXISTS "Authenticated users can update nest pro partners" ON public.nest_pro_partners;
DROP POLICY IF EXISTS "Authenticated users can delete nest pro partners" ON public.nest_pro_partners;

CREATE POLICY "All users can view nest pro partners"
ON public.nest_pro_partners FOR SELECT
USING (true);

CREATE POLICY "Elevated users can create nest pro partners"
ON public.nest_pro_partners FOR INSERT
WITH CHECK (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can update nest pro partners"
ON public.nest_pro_partners FOR UPDATE
USING (has_elevated_access(auth.uid()));

CREATE POLICY "Elevated users can delete nest pro partners"
ON public.nest_pro_partners FOR DELETE
USING (has_elevated_access(auth.uid()));

-- ========================================
-- 9. OUTREACH ACTIVITIES (Already has created_by but needs company check)
-- ========================================
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.outreach_activities;
DROP POLICY IF EXISTS "Authenticated users can create activities" ON public.outreach_activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.outreach_activities;
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON public.outreach_activities;

CREATE POLICY "Users can view activities for their companies"
ON public.outreach_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = outreach_activities.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create activities for their companies"
ON public.outreach_activities FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = outreach_activities.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update activities for their companies"
ON public.outreach_activities FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = outreach_activities.company_id
      AND (has_elevated_access(auth.uid()) OR c.created_by = auth.uid())
  )
);

CREATE POLICY "Elevated users can delete activities"
ON public.outreach_activities FOR DELETE
USING (has_elevated_access(auth.uid()));
