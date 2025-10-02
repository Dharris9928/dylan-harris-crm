import { supabase } from '@/integrations/supabase/client';

export async function requestDeletion(
  tableName: 'companies' | 'contacts' | 'outreach_activities' | 'pilot_programs' | 'training_certifications',
  recordId: string,
  recordDetails?: any,
  reason?: string
) {
  try {
    // Check if user is admin (admins can delete directly)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // If admin, delete directly
    if (userRole?.role === 'admin') {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', recordId);

      if (error) throw error;
      return { success: true, immediate: true };
    }

    // Otherwise, create a deletion request
    const { error } = await supabase
      .from('deletion_requests')
      .insert({
        requested_by: user.id,
        table_name: tableName,
        record_id: recordId,
        record_details: recordDetails || null,
        reason: reason || null,
        status: 'pending'
      });

    if (error) throw error;
    return { success: true, immediate: false };
  } catch (error) {
    console.error('Error requesting deletion:', error);
    throw error;
  }
}

