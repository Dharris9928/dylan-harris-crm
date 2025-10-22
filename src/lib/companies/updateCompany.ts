import { supabase } from '@/integrations/supabase/client';
import { calculateLeadScore } from '@/lib/scoring/leadScoring';
import { validateCompanyData } from '@/lib/validation/companyValidation';
import { formatError } from '@/lib/errors/databaseErrorHandler';
import type { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Update'];

export async function updateCompany(
  companyId: string,
  updates: Partial<Company>
) {
  try {
    // Validate company data
    const validation = validateCompanyData(updates);
    if (!validation.valid) {
      throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
    }
    // 1. Update company
    const { data: company, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select()
      .single();

    if (error) throw error;

    // 2. Check if scoring fields changed
    const scoringFields = [
      'annual_revenue_range',
      'total_employees',
      'years_in_business',
      'city',
      'website_url',
      'linkedin_company_url'
    ];

    const shouldRecalculate = Object.keys(updates).some(key =>
      scoringFields.includes(key)
    );

    // 3. AUTOMATICALLY recalculate if needed
    if (shouldRecalculate) {
      await calculateLeadScore(companyId);
    }

    return company;
  } catch (error) {
    console.error('Error updating company:', error);
    const formattedError = formatError(error);
    throw new Error(formattedError);
  }
}
