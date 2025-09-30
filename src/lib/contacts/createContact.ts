import { supabase } from '@/integrations/supabase/client';
import { calculateLeadScore } from '@/lib/scoring/leadScoring';
import type { Database } from '@/integrations/supabase/types';

type Contact = Database['public']['Tables']['contacts']['Insert'];

export async function createContact(contactData: Partial<Contact>) {
  try {
    // 1. Insert contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert(contactData as Contact)
      .select()
      .single();

    if (error) throw error;

    // 2. AUTOMATICALLY recalculate parent company score
    if (contact.company_id) {
      await calculateLeadScore(contact.company_id);
    }

    return contact;
  } catch (error) {
    console.error('Error creating contact:', error);
    throw error;
  }
}
