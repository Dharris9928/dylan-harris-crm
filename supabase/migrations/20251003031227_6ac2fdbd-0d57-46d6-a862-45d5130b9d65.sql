-- Add industry_specialties field to companies table for multi-select industry types
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS industry_specialties TEXT[] DEFAULT NULL;