import { supabase } from '@/integrations/supabase/client';
import { calculateLeadScore } from '@/lib/scoring/leadScoring';
import { formatError } from '@/lib/errors/databaseErrorHandler';
import type { Database } from '@/integrations/supabase/types';

type Contact = Database['public']['Tables']['contacts']['Insert'];

export async function createContact(contactData: Partial<Contact>) {
  try {
    // 1. Check for duplicates (same first name, last name, and company)
    if (contactData.first_name && contactData.last_name && contactData.company_id) {
      const { data: existingContacts, error: checkError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('company_id', contactData.company_id)
        .ilike('first_name', contactData.first_name.trim())
        .ilike('last_name', contactData.last_name.trim());

      if (checkError) {
        console.error('Error checking for duplicates:', checkError);
      } else if (existingContacts && existingContacts.length > 0) {
        const duplicate = existingContacts[0];
        throw new Error(
          `A contact named ${duplicate.first_name} ${duplicate.last_name} already exists at this company${
            duplicate.email ? ` (${duplicate.email})` : ''
          }. If this is not a duplicate, please modify the name slightly.`
        );
      }
    }

    // 1b. Also check by email across all companies (case-insensitive)
    if (contactData.email && contactData.email.trim()) {
      const { data: emailMatches } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, company_id')
        .ilike('email', contactData.email.trim())
        .limit(1);

      if (emailMatches && emailMatches.length > 0) {
        const match = emailMatches[0];
        throw new Error(
          `A contact with email "${match.email}" already exists (${match.first_name} ${match.last_name}). Please check if this is a duplicate.`
        );
      }
    }

    // 2. Insert contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert(contactData as Contact)
      .select()
      .single();

    if (error) throw error;

    // 3. AUTOMATICALLY recalculate parent company score
    if (contact.company_id) {
      await calculateLeadScore(contact.company_id);
    }

    return contact;
  } catch (error) {
    console.error('Error creating contact:', error);
    const formattedError = formatError(error);
    throw new Error(formattedError);
  }
}
