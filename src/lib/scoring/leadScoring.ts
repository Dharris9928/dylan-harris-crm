import { supabase } from '@/integrations/supabase/client';
import { calculateBuilderScore, type BuilderScoringBreakdown } from './builderScoring';
import { calculateContractorScore, type ContractorScoringBreakdown } from './contractorScoring';

export type ScoringBreakdown = BuilderScoringBreakdown | ContractorScoringBreakdown;

/**
 * Calculate lead score for a company
 * Routes to industry-specific scoring algorithm
 */
export async function calculateLeadScore(companyId: string): Promise<ScoringBreakdown> {
  // Fetch company to determine industry type
  const { data: company, error } = await supabase
    .from('companies')
    .select('industry_type')
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  // Route to correct scoring algorithm based on industry
  // Builder uses builder scoring
  // Contractor, Energy Implementer, Engineer/Architect, and Partner/Other use contractor scoring
  if (company.industry_type === 'Builder') {
    return await calculateBuilderScore(companyId);
  } else {
    // Use contractor scoring for all other industry types
    return await calculateContractorScore(companyId);
  }
}
