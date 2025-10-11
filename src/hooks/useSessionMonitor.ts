import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface SessionConfig {
  idle_timeout_minutes: number;
  absolute_timeout_hours: number;
  max_concurrent_sessions: number;
}

export function useSessionMonitor() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const lastActivityRef = useRef<number>(Date.now());
  const sessionTokenRef = useRef<string>('');
  const warningTimerRef = useRef<NodeJS.Timeout>();
  const activityTimerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Generate or retrieve session token
  useEffect(() => {
    const existingToken = sessionStorage.getItem('session_token');
    if (existingToken) {
      sessionTokenRef.current = existingToken;
    } else {
      const newToken = crypto.randomUUID();
      sessionStorage.setItem('session_token', newToken);
      sessionTokenRef.current = newToken;
    }
  }, []);

  // Track user activity
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
  };

  // Ping backend to update session
  const pingSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Hash the session token before sending
      const encoder = new TextEncoder();
      const data = encoder.encode(sessionTokenRef.current);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await supabase.rpc('track_user_session', {
        _user_id: user.id,
        _session_token_hash: hashHex,
        _ip_address: null,
        _user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to ping session:', error);
    }
  };

  // Check for idle timeout
  const checkIdleTimeout = async () => {
    const { data: config } = await supabase
      .from('session_config')
      .select('*')
      .single();

    if (!config) return;

    const idleTime = Date.now() - lastActivityRef.current;
    const timeoutMs = config.idle_timeout_minutes * 60 * 1000;
    const warningMs = timeoutMs - (2 * 60 * 1000); // 2 minutes before timeout

    if (idleTime >= timeoutMs) {
      // Timeout reached - logout
      handleTimeout();
    } else if (idleTime >= warningMs && !showWarning) {
      // Show warning
      setShowWarning(true);
      setTimeRemaining(Math.floor((timeoutMs - idleTime) / 1000));
      
      // Start countdown
      warningTimerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(warningTimerRef.current);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Handle session timeout
  const handleTimeout = async () => {
    setShowWarning(false);
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
    }

    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity.",
      variant: "destructive",
    });

    await supabase.auth.signOut();
    sessionStorage.removeItem('session_token');
    navigate('/auth');
  };

  // Extend session (dismiss warning)
  const extendSession = () => {
    updateActivity();
    setShowWarning(false);
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
    }
    pingSession();
  };

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Ping session every 5 minutes
    activityTimerRef.current = setInterval(() => {
      pingSession();
      checkIdleTimeout();
    }, 5 * 60 * 1000);

    // Initial ping
    pingSession();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
      }
    };
  }, []);

  return {
    showWarning,
    timeRemaining,
    extendSession,
    handleTimeout
  };
}
