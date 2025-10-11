import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExportQuotaCheck {
  allowed: boolean;
  requires_approval: boolean;
  approval_threshold?: number;
  daily_limit?: number;
  used_today?: number;
  remaining_quota?: number;
  record_count?: number;
  reason?: string;
}

export function useExportQuota() {
  const { data: userRole } = useQuery({
    queryKey: ['user-role-export'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data.role;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: quota } = useQuery({
    queryKey: ['export-quota', userRole],
    queryFn: async () => {
      if (!userRole) return null;

      const { data, error } = await supabase
        .from('export_quotas')
        .select('*')
        .eq('role', userRole)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userRole,
    staleTime: 10 * 60 * 1000,
  });

  const checkQuota = async (
    recordCount: number,
    tableName: string
  ): Promise<ExportQuotaCheck> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { allowed: false, requires_approval: false, reason: 'Not authenticated' };
    }

    const { data, error } = await supabase.rpc('check_export_quota', {
      _user_id: user.id,
      _record_count: recordCount,
      _table_name: tableName,
    });

    if (error) {
      console.error('Error checking export quota:', error);
      return { allowed: false, requires_approval: false, reason: 'Error checking quota' };
    }

    return data as unknown as ExportQuotaCheck;
  };

  const logExport = async (
    tableName: string,
    recordCount: number,
    exportType: 'CSV' | 'EXCEL' | 'PDF' | 'JSON',
    filterCriteria?: any
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc('log_export_activity', {
      _user_id: user.id,
      _table_name: tableName,
      _record_count: recordCount,
      _export_type: exportType,
      _filter_criteria: filterCriteria || null,
    });

    if (error) {
      console.error('Error logging export:', error);
      return null;
    }

    return data;
  };

  return {
    userRole,
    quota,
    checkQuota,
    logExport,
  };
}
