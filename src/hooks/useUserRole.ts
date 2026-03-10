import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/hooks/useImpersonation';

export function useUserRole() {
  const { impersonation, isImpersonating } = useImpersonation();

  return useQuery({
    queryKey: ['user-role', isImpersonating ? impersonation?.userId : null],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { role: null, hasElevatedAccess: false, isImpersonating: false, actualUserId: null };

      // If impersonating, use the impersonated user's role for display purposes
      // but actual data access is still governed by RLS on the real JWT
      const targetUserId = isImpersonating && impersonation?.userId
        ? impersonation.userId
        : user.id;

      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return { role: null, hasElevatedAccess: false, isImpersonating, actualUserId: user.id };
      }

      const hasElevatedAccess = roleData?.role === 'admin' || roleData?.role === 'sales_manager';
      
      return {
        role: roleData?.role || null,
        hasElevatedAccess,
        isImpersonating,
        actualUserId: user.id,
        ...(isImpersonating ? { impersonatedUserId: impersonation?.userId } : {}),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
