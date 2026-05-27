import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RecordAccessParams {
  tableName: 'companies' | 'contacts' | 'opportunities';
  recordId: string;
}

export function useRecordAccess({ tableName, recordId }: RecordAccessParams) {
  const queryClient = useQueryClient();

  // Check if current user has access to this record
  const { data: hasAccess, isLoading: checkingAccess } = useQuery({
    queryKey: ['record-access', tableName, recordId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc('has_record_access', {
        _user_id: user.id,
        _table_name: tableName,
        _record_id: recordId
      });

      if (error) throw error;
      return data as boolean;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Check if there's a pending request
  const { data: pendingRequest } = useQuery({
    queryKey: ['access-request', tableName, recordId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('record_access_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !hasAccess, // Only check if user doesn't have access
  });

  // Request access mutation
  const requestAccessMutation = useMutation({
    mutationFn: async (justification: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('record_access_requests')
        .insert({
          user_id: user.id,
          table_name: tableName,
          record_id: recordId,
          justification,
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['access-request', tableName, recordId] });
      toast({
        title: 'Access requested',
        description: 'Your request has been submitted for review.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Request failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    hasAccess: hasAccess ?? false,
    checkingAccess,
    pendingRequest,
    requestAccess: requestAccessMutation.mutate,
    isRequestingAccess: requestAccessMutation.isPending,
  };
}
