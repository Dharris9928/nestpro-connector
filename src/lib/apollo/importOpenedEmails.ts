import { supabase } from '@/integrations/supabase/client';

export interface OpenedEmailRow {
  email: string;
  subject?: string;
  openedAt: string;
  apolloId?: string;
  openCount?: number;
  sentAt?: string;
  clicked?: boolean;
  replied?: boolean;
}

export interface MatchedRecord {
  csvRow: OpenedEmailRow;
  dbRecord: {
    id: string;
    apollo_activity_id: string | null;
    subject: string | null;
    apollo_contact_email: string | null;
    sent_at: string | null;
    company_id: string | null;
    contact_id: string | null;
  };
  matchType: 'apollo_id' | 'email_subject' | 'email_only';
  confidence: number;
}

export interface MatchResult {
  matched: MatchedRecord[];
  unmatched: OpenedEmailRow[];
  totalCsvRows: number;
}

export interface UpdateResult {
  updated: number;
  errors: string[];
}

// Common Apollo CSV column name variations - updated for actual Apollo export format
export const APOLLO_COLUMN_MAPPINGS = {
  // "To Email" is the standard Apollo export column name
  email: ['to email', 'email', 'contact email', 'contact_email', 'email address', 'recipient email', 'to'],
  subject: ['subject', 'email subject', 'subject line', 'email_subject'],
  openedAt: ['opened at', 'opened_at', 'first opened at', 'first_opened_at', 'open date', 'opened date'],
  openCount: ['open count', 'open_count', 'total opens', 'opens', 'times opened'],
  apolloId: ['message id', 'message_id', 'email id', 'email_id', 'activity id', 'activity_id', 'id'],
  // Prioritize specific timestamp formats over the ambiguous "sent" (which could be boolean)
  sentAt: ['sent at (pst)', 'sent at (utc)', 'sent at (est)', 'sent at', 'sent_at', 'sent date', 'date sent'],
  // Boolean status columns from Apollo exports
  opened: ['open', 'opened', 'is opened', 'was opened', 'is open'],
  clicked: ['click', 'clicked', 'is clicked', 'was clicked', 'link clicked'],
  replied: ['replied', 'reply', 'is replied', 'was replied', 'has replied'],
  // "Sent" as boolean (separate from timestamp)
  sent: ['sent'],
};

function isBooleanLike(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  const v = value.toLowerCase().trim();
  return v === 'true' || v === 'false' || v === 'yes' || v === 'no' || v === '1' || v === '0';
}

function parseBoolean(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase().trim();
  return v === 'true' || v === 'yes' || v === '1';
}

function firstTimestampCandidate(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (isBooleanLike(trimmed)) continue;
    return trimmed;
  }
  return null;
}

/**
 * Auto-detect column mappings from CSV headers
 */
export function autoDetectColumns(headers: string[]): Record<string, string | null> {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  const result: Record<string, string | null> = {
    email: null,
    subject: null,
    openedAt: null,
    openCount: null,
    apolloId: null,
    sentAt: null,
    opened: null,
    clicked: null,
    replied: null,
    sent: null, // Boolean "was email sent" vs sentAt timestamp
  };

  // Prefer the most-specific match when multiple headers could match a field.
  // Example: Apollo exports include both "Sent" (boolean) and "Sent At (PST)" (timestamp).
  // We should prefer the longer/more-specific variation ("sent at (pst)") over "sent".
  for (const [field, variations] of Object.entries(APOLLO_COLUMN_MAPPINGS)) {
    let bestIndex = -1;
    let bestScore = -1;

    for (const variation of variations) {
      const index = lowerHeaders.indexOf(variation);
      if (index === -1) continue;

      const score = variation.length;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex !== -1) {
      result[field] = headers[bestIndex];
    }
  }

  return result;
}

/**
 * Parse CSV rows into OpenedEmailRow objects
 * Supports both timestamp-based "Opened At" columns AND boolean "Open" columns
 */
export function parseOpenedEmails(
  rows: Record<string, string>[],
  columnMapping: Record<string, string | null>
): OpenedEmailRow[] {
  const results: OpenedEmailRow[] = [];

  for (const row of rows) {
    const email = columnMapping.email ? row[columnMapping.email]?.trim() : null;
    if (!email) continue;

    // Check for boolean "Open" column first (Apollo's actual format)
    const openedBooleanValue = columnMapping.opened ? row[columnMapping.opened]?.toLowerCase().trim() : null;
    const openedAtValue = columnMapping.openedAt ? row[columnMapping.openedAt]?.trim() : null;
    const sentAtValue = columnMapping.sentAt ? row[columnMapping.sentAt]?.trim() : null;

    // Determine if this email was opened
    let isOpened = false;
    let openedTimestamp: string | null = null;

    if (openedBooleanValue !== null) {
      // Boolean column format (Apollo export)
      isOpened = parseBoolean(openedBooleanValue);
      // Use sentAt (timestamp) if available; otherwise fallback to now.
      openedTimestamp = firstTimestampCandidate(sentAtValue, openedAtValue) ?? new Date().toISOString();
    } else if (openedAtValue) {
      if (isBooleanLike(openedAtValue)) {
        // Some users accidentally map the boolean "Open" column into "Opened At".
        // Treat it as a boolean open indicator and use sentAt/now for timestamp.
        isOpened = parseBoolean(openedAtValue);
        openedTimestamp = firstTimestampCandidate(sentAtValue) ?? new Date().toISOString();
      } else {
        // Timestamp column format (legacy support)
        isOpened = true;
        openedTimestamp = openedAtValue;
      }
    } else {
      // No open indicator - skip this row
      continue;
    }

    if (!isOpened) continue;

    // Parse click and reply status
    const clickedValue = columnMapping.clicked ? row[columnMapping.clicked]?.toLowerCase().trim() : null;
    const repliedValue = columnMapping.replied ? row[columnMapping.replied]?.toLowerCase().trim() : null;

    const isClicked = clickedValue === 'true' || clickedValue === 'yes' || clickedValue === '1';
    const isReplied = repliedValue === 'true' || repliedValue === 'yes' || repliedValue === '1';

    results.push({
      email,
      subject: columnMapping.subject ? row[columnMapping.subject]?.trim() : undefined,
      openedAt: openedTimestamp || new Date().toISOString(),
      apolloId: columnMapping.apolloId ? row[columnMapping.apolloId]?.trim() : undefined,
      openCount: columnMapping.openCount ? parseInt(row[columnMapping.openCount], 10) || 1 : 1,
      sentAt: sentAtValue || undefined,
      clicked: isClicked || undefined,
      replied: isReplied || undefined,
    });
  }

  return results;
}

/**
 * Match CSV rows against apollo_email_activities in the database
 */
export async function matchOpenedEmails(
  parsedRows: OpenedEmailRow[]
): Promise<MatchResult> {
  const matched: MatchedRecord[] = [];
  const unmatched: OpenedEmailRow[] = [];

  // Fetch all apollo_email_activities records
  const { data: dbRecords, error } = await supabase
    .from('apollo_email_activities')
    .select('id, apollo_activity_id, subject, apollo_contact_email, sent_at, company_id, contact_id');

  if (error) {
    console.error('Error fetching apollo_email_activities:', error);
    throw new Error('Failed to fetch email activities from database');
  }

  if (!dbRecords || dbRecords.length === 0) {
    return {
      matched: [],
      unmatched: parsedRows,
      totalCsvRows: parsedRows.length,
    };
  }

  // Create lookup maps for efficient matching
  const byApolloId = new Map<string, typeof dbRecords[0]>();
  const byEmailSubject = new Map<string, typeof dbRecords[0][]>();
  const byEmailOnly = new Map<string, typeof dbRecords[0][]>();

  for (const record of dbRecords) {
    if (record.apollo_activity_id) {
      byApolloId.set(record.apollo_activity_id.toLowerCase(), record);
    }

    if (record.apollo_contact_email) {
      const email = record.apollo_contact_email.toLowerCase();
      
      // Email + Subject map
      if (record.subject) {
        const key = `${email}|${record.subject.toLowerCase()}`;
        if (!byEmailSubject.has(key)) {
          byEmailSubject.set(key, []);
        }
        byEmailSubject.get(key)!.push(record);
      }

      // Email only map
      if (!byEmailOnly.has(email)) {
        byEmailOnly.set(email, []);
      }
      byEmailOnly.get(email)!.push(record);
    }
  }

  // Match each CSV row
  for (const csvRow of parsedRows) {
    let matchedRecord: MatchedRecord | null = null;

    // Priority 1: Match by Apollo ID
    if (csvRow.apolloId) {
      const dbRecord = byApolloId.get(csvRow.apolloId.toLowerCase());
      if (dbRecord) {
        matchedRecord = {
          csvRow,
          dbRecord,
          matchType: 'apollo_id',
          confidence: 100,
        };
      }
    }

    // Priority 2: Match by Email + Subject
    if (!matchedRecord && csvRow.email && csvRow.subject) {
      const key = `${csvRow.email.toLowerCase()}|${csvRow.subject.toLowerCase()}`;
      const candidates = byEmailSubject.get(key);
      if (candidates && candidates.length > 0) {
        // Take the first match (could add date matching for better precision)
        matchedRecord = {
          csvRow,
          dbRecord: candidates[0],
          matchType: 'email_subject',
          confidence: 85,
        };
      }
    }

    // Priority 3: Match by Email + filter candidates by subject (for multi-email contacts)
    if (!matchedRecord && csvRow.email && csvRow.subject) {
      const candidates = byEmailOnly.get(csvRow.email.toLowerCase());
      if (candidates && candidates.length > 1) {
        // Try to find the one with matching subject
        const subjectLower = csvRow.subject.toLowerCase();
        const matchingCandidate = candidates.find(c => 
          c.subject?.toLowerCase() === subjectLower
        );
        if (matchingCandidate) {
          matchedRecord = {
            csvRow,
            dbRecord: matchingCandidate,
            matchType: 'email_subject',
            confidence: 75, // Slightly lower than direct map lookup
          };
        }
      }
    }

    // Priority 4: Match by Email only (least precise) - only when exactly one email to contact
    if (!matchedRecord && csvRow.email) {
      const candidates = byEmailOnly.get(csvRow.email.toLowerCase());
      if (candidates && candidates.length === 1) {
        // Only match if there's exactly one email to that contact
        matchedRecord = {
          csvRow,
          dbRecord: candidates[0],
          matchType: 'email_only',
          confidence: 60,
        };
      }
    }

    if (matchedRecord) {
      matched.push(matchedRecord);
    } else {
      unmatched.push(csvRow);
    }
  }

  return {
    matched,
    unmatched,
    totalCsvRows: parsedRows.length,
  };
}

/**
 * Update matched records with opened/clicked/replied data
 */
export async function updateOpenedEmails(
  matchedRecords: MatchedRecord[]
): Promise<UpdateResult> {
  const errors: string[] = [];
  let updated = 0;

  // Get current user for logging
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  // Batch update apollo_email_activities
  for (const match of matchedRecords) {
    try {
      // Parse the opened timestamp
      const openedAt = parseTimestamp(match.csvRow.openedAt);
      if (!openedAt) {
        errors.push(`Invalid timestamp for email to ${match.csvRow.email}: ${match.csvRow.openedAt}`);
        continue;
      }

      // Build update object
      const updateData: Record<string, any> = {
        opened_at: openedAt.toISOString(),
        open_count: Math.max(match.csvRow.openCount || 1, 1),
        status: 'opened',
        updated_at: new Date().toISOString(),
      };

      // Add click data if present
      if (match.csvRow.clicked) {
        updateData.clicked_at = openedAt.toISOString(); // Use same timestamp as best estimate
        updateData.click_count = 1;
      }

      // Add reply data if present
      if (match.csvRow.replied) {
        updateData.replied_at = openedAt.toISOString();
        updateData.reply_count = 1;
        updateData.status = 'replied'; // Override status if replied
      }

      // Update apollo_email_activities
      const { error: updateError } = await supabase
        .from('apollo_email_activities')
        .update(updateData)
        .eq('id', match.dbRecord.id);

      if (updateError) {
        errors.push(`Failed to update activity ${match.dbRecord.id}: ${updateError.message}`);
        continue;
      }

      // Also update company_communications if linked
      if (match.dbRecord.company_id && match.dbRecord.contact_id) {
        const commUpdateData: Record<string, any> = {
          email_opened_at: openedAt.toISOString(),
        };
        
        if (match.csvRow.replied) {
          commUpdateData.email_responded_at = openedAt.toISOString();
        }

        const { error: commError } = await supabase
          .from('company_communications')
          .update(commUpdateData)
          .eq('company_id', match.dbRecord.company_id)
          .eq('contact_id', match.dbRecord.contact_id)
          .ilike('subject', match.dbRecord.subject || '')
          .is('email_opened_at', null); // Only update if not already set
        
        if (commError) {
          console.warn(`Could not update company_communications: ${commError.message}`);
          // Don't count as error since main update succeeded
        }
      }

      updated++;
    } catch (err: any) {
      errors.push(`Error processing ${match.csvRow.email}: ${err.message}`);
    }
  }

  // Log the import activity
  if (userId && updated > 0) {
    try {
      await supabase.from('import_export_logs').insert({
        user_id: userId,
        activity_type: 'import',
        table_name: 'apollo_email_activities',
        record_count: matchedRecords.length,
        successful_count: updated,
        failed_count: errors.length,
        file_format: 'csv',
        error_summary: errors.length > 0 ? `${errors.length} records failed` : null,
        detailed_errors: errors.length > 0 ? { errors: errors.slice(0, 10) } : null,
      });
    } catch (logError) {
      console.warn('Failed to log import activity:', logError);
    }
  }

  return {
    updated,
    errors,
  };
}

/**
 * Parse various timestamp formats that Apollo might export
 */
function parseTimestamp(value: string): Date | null {
  if (!value) return null;

  // Apollo exports often include timezone markers like "(PST)" or "PST".
  // Strip those before parsing.
  const cleaned = value
    .trim()
    .replace(/\s*\(([^)]+)\)\s*/g, ' ')
    .replace(/\b(PST|PDT|EST|EDT|UTC)\b/gi, '')
    .trim();

  // Try parsing as ISO date
  let date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try Apollo's format: "January 09, 2026 07:32"
  const apolloFormatMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (apolloFormatMatch) {
    const [, month, day, year, hour, minute, second] = apolloFormatMatch;
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    if (!isNaN(monthIndex)) {
      date = new Date(
        parseInt(year),
        monthIndex,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        second ? parseInt(second) : 0
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Common Apollo export format: MM/DD/YYYY HH:MM (optionally seconds, optionally AM/PM)
  const mmddMatch = cleaned.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?$/
  );
  if (mmddMatch) {
    const [, mm, dd, yyyy, hh = '0', min = '0', sec = '0', ampm] = mmddMatch;
    let hours = parseInt(hh, 10);
    const minutes = parseInt(min, 10);
    const seconds = parseInt(sec, 10);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === 'PM' && hours < 12) hours += 12;
      if (upper === 'AM' && hours === 12) hours = 0;
    }
    date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), hours, minutes, seconds);
    if (!isNaN(date.getTime())) return date;
  }

  // Try common formats
  const formats = [
    // MM/DD/YYYY HH:MM:SS
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
    // YYYY-MM-DD HH:MM:SS
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
    // DD/MM/YYYY HH:MM:SS
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?/,
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      // Attempt to parse
      date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Last resort: try Date.parse
  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}
