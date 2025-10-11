import { useEffect } from 'react';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { SessionTimeoutWarning } from '@/components/settings/SessionTimeoutWarning';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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
