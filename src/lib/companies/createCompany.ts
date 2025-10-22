import { supabase } from '@/integrations/supabase/client';
import { calculateLeadScore } from '@/lib/scoring/leadScoring';
import { validateCompanyData } from '@/lib/validation/companyValidation';
import { formatError } from '@/lib/errors/databaseErrorHandler';
import type { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Insert'];

export async function createCompany(companyData: Partial<Company>) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create a company');
    }

    // Validate company data
    const validation = validateCompanyData(companyData);
    if (!validation.valid) {
      throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
    }

    // Set created_by to current user
    const dataToInsert = {
      ...companyData,
      created_by: user.id
    };

    // 1. Insert company
    const { data: company, error } = await supabase
      .from('companies')
      .insert(dataToInsert as Company)
      .select()
      .single();

    if (error) throw error;

    // 2. AUTOMATICALLY calculate score
    const scoring = await calculateLeadScore(company.id);

    // 3. Return company with calculated score
    return {
      ...company,
      lead_score: scoring.totalScore,
      priority_tier: scoring.priorityTier
    };
  } catch (error) {
    console.error('Error creating company:', error);
    const formattedError = formatError(error);
    throw new Error(formattedError);
  }
}
