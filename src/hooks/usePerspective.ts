import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Perspective } from '@/components/common/PerspectiveSelector';

const PERSPECTIVE_STORAGE_KEY = 'user-perspective-filter';

export function usePerspective(
  defaultPerspective: Perspective = 'my_records',
  pageName?: 'companies' | 'contacts' | 'opportunities' | 'activities'
) {
  const [perspective, setPerspective] = useState<Perspective>(() => {
    const stored = localStorage.getItem(PERSPECTIVE_STORAGE_KEY);
    return (stored as Perspective) || defaultPerspective;
  });

  useEffect(() => {
    localStorage.setItem(PERSPECTIVE_STORAGE_KEY, perspective);
    
    // Track perspective usage analytics
    if (pageName) {
      trackPerspectiveUsage(perspective, pageName);
    }
  }, [perspective, pageName]);

  return {
    perspective,
    setPerspective,
  };
}

async function trackPerspectiveUsage(
  perspectiveType: Perspective,
  pageName: 'companies' | 'contacts' | 'opportunities' | 'activities'
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sessionId = sessionStorage.getItem('session-id') || 
      `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!sessionStorage.getItem('session-id')) {
      sessionStorage.setItem('session-id', sessionId);
    }

    await supabase.from('perspective_usage_analytics').insert({
      user_id: user.id,
      perspective_type: perspectiveType,
      page_name: pageName,
      session_id: sessionId,
    });
  } catch (error) {
    console.error('Error tracking perspective usage:', error);
  }
}
