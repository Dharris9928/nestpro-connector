import { supabase } from '@/integrations/supabase/client';
import { calculateLeadScore } from '@/lib/scoring/leadScoring';
import type { Database } from '@/integrations/supabase/types';

type Installation = Database['public']['Tables']['installation_history']['Insert'];

export async function createInstallation(installationData: Partial<Installation>) {
  try {
    // 1. Insert installation
    const { data: installation, error } = await supabase
      .from('installation_history')
      .insert(installationData as Installation)
      .select()
      .single();

    if (error) throw error;

    // 2. AUTOMATICALLY recalculate parent company score
    if (installation.company_id) {
      await calculateLeadScore(installation.company_id);
    }

    return installation;
  } catch (error) {
    console.error('Error creating installation:', error);
    throw error;
  }
}
