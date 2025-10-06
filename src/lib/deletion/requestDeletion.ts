import { supabase } from '@/integrations/supabase/client';

export async function requestDeletion(
  tableName: 'companies' | 'contacts' | 'outreach_activities' | 'pilot_programs' | 'training_certifications',
  recordId: string,
  recordDetails?: any,
  reason?: string
) {
  try {
    // Check if user is admin (admins can delete directly)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // If admin, delete directly
    if (userRole?.role === 'admin') {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', recordId);

      if (error) throw error;
      return { success: true, immediate: true };
    }

    // Otherwise, create a deletion request
    const { data: deletionData, error } = await supabase
      .from('deletion_requests')
      .insert({
        requested_by: user.id,
        table_name: tableName,
        record_id: recordId,
        record_details: recordDetails || null,
        reason: reason || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Get user's email for notification
    const { data: { user: userData } } = await supabase.auth.getUser();
    
    // Send deletion request notification to admins
    if (deletionData && userData?.email) {
      try {
        await supabase.functions.invoke('send-deletion-request-notification', {
          body: {
            requestId: deletionData.id,
            tableName,
            requestedByEmail: userData.email,
            reason
          }
        });
      } catch (notifError) {
        console.error('Error sending deletion notification:', notifError);
        // Don't fail request if notification fails
      }
    }

    return { success: true, immediate: false };
  } catch (error) {
    console.error('Error requesting deletion:', error);
    throw error;
  }
}

