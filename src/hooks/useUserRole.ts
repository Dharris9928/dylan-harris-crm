import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserRole() {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      // Check for impersonation
      const impersonationData = sessionStorage.getItem('admin-impersonation');
      const impersonation = impersonationData ? JSON.parse(impersonationData) : null;

      // Use impersonated user ID if active, otherwise use actual user
      const userId = impersonation?.userId;
      
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { role: null, hasElevatedAccess: false, isImpersonating: false, actualUserId: null };

        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          return { role: null, hasElevatedAccess: false, isImpersonating: false, actualUserId: user.id };
        }

        const hasElevatedAccess = roleData?.role === 'admin' || roleData?.role === 'sales_manager';
        
        return {
          role: roleData?.role || null,
          hasElevatedAccess,
          isImpersonating: false,
          actualUserId: user.id
        };
      }

      // When impersonating, fetch the impersonated user's role
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching impersonated user role:', error);
        return { role: null, hasElevatedAccess: false, isImpersonating: true, actualUserId: userId };
      }

      const hasElevatedAccess = roleData?.role === 'admin' || roleData?.role === 'sales_manager';
      
      return {
        role: roleData?.role || null,
        hasElevatedAccess,
        isImpersonating: true,
        impersonatedUserId: userId
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
