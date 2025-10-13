-- Add audit logging triggers for companies table
CREATE TRIGGER audit_companies_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.log_table_changes();

-- Add audit logging triggers for company_communications table
CREATE TRIGGER audit_communications_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.company_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_table_changes();

-- Check if opportunities table exists and add trigger
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'opportunities'
  ) THEN
    EXECUTE 'CREATE TRIGGER audit_opportunities_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
      FOR EACH ROW
      EXECUTE FUNCTION public.log_table_changes()';
  END IF;
END $$;