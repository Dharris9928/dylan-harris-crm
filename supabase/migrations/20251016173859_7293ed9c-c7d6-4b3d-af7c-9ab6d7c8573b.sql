-- Update companies table constraints to support all 5 industry types

-- Drop existing constraints
ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS companies_industry_type_check,
  DROP CONSTRAINT IF EXISTS companies_segment_valid;

-- Add updated industry_type constraint with all 5 types
ALTER TABLE companies 
  ADD CONSTRAINT companies_industry_type_check 
    CHECK (industry_type IN ('Builder', 'Contractor', 'Energy Implementer', 'Engineer/Architect', 'Partner/Other'));

-- Add updated segment validation constraint with all industry types
ALTER TABLE companies 
  ADD CONSTRAINT companies_segment_valid CHECK (
    segment IS NULL OR 
    (
      -- Builder segments
      (industry_type = 'Builder' AND segment IN (
        'production_tract', 'regional_mid_volume', 'spec_home',
        'luxury_custom', 'multi_family', 'affordable_housing', 'active_adult'
      ))
      OR
      -- Contractor segments
      (industry_type = 'Contractor' AND segment IN (
        'smart_home_champions', 'customer_experience', 'high_volume',
        'premium_specialists', 'regional_growth', 'specialty_integrators',
        'traditionalists', 'emergency_repair'
      ))
      OR
      -- Energy Implementer segments
      (industry_type = 'Energy Implementer' AND segment IN (
        'solar_installers', 'hvac_energy_specialists', 'energy_auditors',
        'retrofit_specialists', 'green_building_consultants', 'battery_storage', 'ev_charging'
      ))
      OR
      -- Engineer/Architect segments
      (industry_type = 'Engineer/Architect' AND segment IN (
        'residential_architects', 'commercial_architects', 'structural_engineers',
        'mep_engineers', 'green_building_designers', 'smart_home_specialists', 'urban_planners'
      ))
      OR
      -- Partner/Other segments
      (industry_type = 'Partner/Other' AND segment IN (
        'technology_partner', 'service_provider', 'vendor', 'consultant',
        'industry_association', 'research_organization', 'other'
      ))
    )
  );