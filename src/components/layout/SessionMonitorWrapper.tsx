import { useEffect } from 'react';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { SessionTimeoutWarning } from '@/components/settings/SessionTimeoutWarning';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function SessionMonitorWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { showWarning, timeRemaining, extendSession, handleTimeout } = useSessionMonitor();

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  // Monitor account status - check every 30 seconds
  useEffect(() => {
    const checkAccountStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .single();

      if (profile?.account_status === 'suspended') {
        await supabase.auth.signOut();
        toast.error('Your account has been suspended. Please contact an administrator.');
        navigate('/auth');
      } else if (profile?.account_status === 'deactivated') {
        await supabase.auth.signOut();
        toast.error('Your account has been deactivated. Please contact an administrator.');
        navigate('/auth');
      }
    };

    // Check immediately
    checkAccountStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkAccountStatus, 30000);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <>
      {children}
      <SessionTimeoutWarning
        open={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onTimeout={handleTimeout}
      />
    </>
  );
}
