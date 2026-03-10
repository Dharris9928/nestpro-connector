import { supabase } from "@/integrations/supabase/client";

/**
 * Logs contact access to the audit log table.
 * Always uses the real authenticated user (RLS-governed).
 * Non-blocking - errors are logged but don't throw.
 */
export async function logContactAccess(
  contactIds: string[],
  action: 'VIEW' | 'EXPORT' | 'BULK_VIEW',
  metadata?: { exportFormat?: string; contactCount?: number }
) {
  try {
    // Always use the real authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const userId = user.id;

    // Get contact details for logging
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, company_id')
      .in('id', contactIds);

    if (!contacts || contacts.length === 0) return;

    // Log each contact access
    const logs = contacts.map(contact => ({
      user_id: userId,
      contact_id: contact.id,
      company_id: contact.company_id,
      action,
      accessed_at: new Date().toISOString(),
    }));

    await supabase.from('contact_access_logs').insert(logs);

    // Log to console in development only
    if (import.meta.env.DEV) {
      console.log(`[Audit] User ${userId} performed ${action} on ${contacts.length} contact(s)`, metadata);
    }
  } catch (error) {
    // Log error but don't throw - audit logging should never break the UI
    console.error('[Audit] Failed to log contact access:', error);
  }
}

/**
 * Logs a single contact view
 */
export async function logSingleContactView(contactId: string) {
  return logContactAccess([contactId], 'VIEW');
}

/**
 * Logs bulk contact viewing (e.g., viewing contacts list)
 */
export async function logBulkContactView(contactIds: string[]) {
  if (contactIds.length === 0) return;
  return logContactAccess(contactIds, 'BULK_VIEW', { contactCount: contactIds.length });
}

/**
 * Logs contact data export
 */
export async function logContactExport(contactIds: string[], exportFormat: string) {
  if (contactIds.length === 0) return;
  return logContactAccess(contactIds, 'EXPORT', { exportFormat, contactCount: contactIds.length });
}
