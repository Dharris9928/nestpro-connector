import { supabase } from '@/integrations/supabase/client';

/**
 * Get score points for a specific field value from configuration
 */
export async function getScoreForRange(
  fieldName: string,
  rangeValue: string,
  industryType: 'Builder' | 'Contractor' | 'CI/Security'
): Promise<number> {
  if (!rangeValue) return 0;

  // Try exact industry match first
  const { data, error } = await supabase
    .from('scoring_configuration')
    .select('score_points')
    .eq('field_name', fieldName)
    .eq('range_value', rangeValue)
    .eq('industry_type', industryType)
    .maybeSingle();

  // If not found, try 'Both' industries
  if (error || !data) {
    const { data: bothData, error: bothError } = await supabase
      .from('scoring_configuration')
      .select('score_points')
      .eq('field_name', fieldName)
      .eq('range_value', rangeValue)
      .eq('industry_type', 'Both')
      .maybeSingle();

    if (bothError || !bothData) return 0;
    return bothData.score_points;
  }

  return data.score_points;
}

/**
 * Get all possible ranges and scores for a field
 */
export async function getFieldScoringOptions(
  fieldName: string,
  industryType: 'Builder' | 'Contractor' | 'CI/Security'
): Promise<Array<{ range: string; points: number; description: string }>> {
  const { data, error } = await supabase
    .from('scoring_configuration')
    .select('range_value, score_points, description')
    .eq('field_name', fieldName)
    .in('industry_type', [industryType, 'Both'])
    .order('score_points', { ascending: false });

  if (error || !data) return [];

  return data.map(item => ({
    range: item.range_value,
    points: item.score_points,
    description: item.description || ''
  }));
}
