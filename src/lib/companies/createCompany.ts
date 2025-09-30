import { supabase } from '@/integrations/supabase/client';
import { calculateLeadScore } from '@/lib/scoring/leadScoring';
import type { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Insert'];

export async function createCompany(companyData: Partial<Company>) {
  try {
    // 1. Insert company
    const { data: company, error } = await supabase
      .from('companies')
      .insert(companyData as Company)
      .select()
      .single();

    if (error) throw error;

    // 2. AUTOMATICALLY calculate score
    const scoring = await calculateLeadScore(company.id);

    // 3. Return company with calculated score
    return {
      ...company,
      lead_score: scoring.totalScore,
      priority_tier: scoring.priorityTier
    };
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
}
