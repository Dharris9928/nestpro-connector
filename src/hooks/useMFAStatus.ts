import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMFAStatus() {
  const queryClient = useQueryClient();

  const { data: mfaStatus, isLoading } = useQuery({
    queryKey: ['mfa-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_mfa_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no status exists, create one for existing users
      if (!data) {
        const { data: newStatus, error: insertError } = await supabase
          .from('user_mfa_status')
          .insert({
            user_id: user.id,
            mfa_enabled: false,
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newStatus;
      }
      
      return data;
    },
  });

  const { data: mfaFactors } = useQuery({
    queryKey: ['mfa-factors'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });

  const updateMFAStatus = useMutation({
    mutationFn: async (enrolled: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('user_mfa_status')
        .update({
          mfa_enabled: enrolled,
          enrolled_at: enrolled ? new Date().toISOString() : null,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
    },
  });

  return {
    mfaStatus,
    mfaFactors,
    isLoading,
    isMFAEnabled: mfaFactors?.totp && mfaFactors.totp.length > 0,
    updateMFAStatus: updateMFAStatus.mutate,
  };
}
