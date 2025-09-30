-- Add score tracking timestamp to Companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS score_calculated_at TIMESTAMP WITH TIME ZONE;

-- Add missing scoring fields to Segmentation_Scores table
ALTER TABLE public.segmentation_scores
ADD COLUMN IF NOT EXISTS decision_authority_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS linkedin_professional_score INTEGER DEFAULT 0;

-- Function to automatically assign priority tier based on score
CREATE OR REPLACE FUNCTION public.auto_assign_priority_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically calculate priority_tier from lead_score
  IF NEW.lead_score >= 80 THEN
    NEW.priority_tier := 'P1';
  ELSIF NEW.lead_score >= 60 THEN
    NEW.priority_tier := 'P2';
  ELSIF NEW.lead_score >= 40 THEN
    NEW.priority_tier := 'P3';
  ELSE
    NEW.priority_tier := 'Unscored';
  END IF;
  
  -- Update timestamp
  NEW.score_calculated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger on INSERT and UPDATE for Companies
DROP TRIGGER IF EXISTS trigger_auto_assign_priority ON public.companies;
CREATE TRIGGER trigger_auto_assign_priority
  BEFORE INSERT OR UPDATE OF lead_score ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_priority_tier();

-- Function to mark company for score recalculation when related data changes
CREATE OR REPLACE FUNCTION public.mark_company_for_recalculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark the parent company as needing recalculation by updating its timestamp
  UPDATE public.companies 
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.company_id, OLD.company_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger when Contacts change
DROP TRIGGER IF EXISTS trigger_contacts_score_update ON public.contacts;
CREATE TRIGGER trigger_contacts_score_update
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_company_for_recalculation();

-- Trigger when Installation_History changes
DROP TRIGGER IF EXISTS trigger_installations_score_update ON public.installation_history;
CREATE TRIGGER trigger_installations_score_update
  AFTER INSERT OR UPDATE OR DELETE ON public.installation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_company_for_recalculation();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_segmentation_company ON public.segmentation_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_segmentation_total ON public.segmentation_scores(total_score);
CREATE INDEX IF NOT EXISTS idx_companies_lead_score ON public.companies(lead_score);
CREATE INDEX IF NOT EXISTS idx_companies_priority_tier ON public.companies(priority_tier);