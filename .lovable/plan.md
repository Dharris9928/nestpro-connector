

# Updated Apollo Email Import - Adapting to Real CSV Format

## Problem
The current implementation expects an "Opened At" timestamp column, but the actual Apollo export uses a **boolean `Open` column** (true/false). We need to adapt the logic to work with your real CSV format.

## Apollo CSV Columns (Actual)
| Column | Example | Used For |
|--------|---------|----------|
| `To Email` | john@acme.com | Match to contact |
| `Subject` | "Follow up..." | Match to email record |
| `Sent At (PST)` | "January 09, 2026 07:32" | Fallback for opened_at |
| `Open` | true/false | Filter opened emails |
| `Click` | true/false | Track link clicks |
| `Replied` | true/false | Track replies |
| `To Company` | "Acme Corp" | Company context |

## Updated Matching Flow

```text
Step 1: Upload CSV
         │
         ▼
Step 2: Auto-detect columns
         │ - "To Email" → email
         │ - "Subject" → subject  
         │ - "Open" → opened (boolean)
         │ - "Sent At (PST)" → sentAt
         ▼
Step 3: Filter rows where Open = "true"
         │
         ▼
Step 4: Match to apollo_email_activities
         │ - By Email + Subject (85% confidence)
         │ - By Email only if unique (60% confidence)
         ▼
Step 5: Update matched records
         │ - opened_at = Sent At timestamp (best available)
         │ - open_count = 1
         │ - status = "opened"
```

## Changes Required

### File 1: `src/lib/apollo/importOpenedEmails.ts`

1. **Update column mappings** to detect Apollo's actual format:
   - Add `"to email"` to email variations
   - Add `"open"` as boolean field
   - Handle `"Sent At (PST)"` format with partial matching

2. **Change parseOpenedEmails logic**:
   - Filter by `Open = "true"` (boolean string)
   - Use `Sent At` as the `openedAt` timestamp (since Apollo doesn't provide exact open time)
   - Make `openedAt` column optional (derive from `sentAt`)

3. **Add click/reply tracking** (bonus):
   - Track `Click`, `Replied` columns too
   - Update `clicked_at`, `replied_at` fields

### File 2: `src/components/communications/ApolloEngagementImportDialog.tsx`

1. **Update required field validation**:
   - Change from requiring `openedAt` to requiring `opened` (boolean) OR `email`
   - Make the flow work with boolean open status

2. **Improve column mapping UI**:
   - Show "Open Status (Boolean)" option
   - Allow `Sent At` to be used as fallback timestamp

3. **Update preview display**:
   - Show count of rows where `Open = true`
   - Clarify that `Sent At` will be used as `opened_at` timestamp

## Technical Details

### Column Detection Updates
```typescript
// Add to APOLLO_COLUMN_MAPPINGS
email: [...existing, 'to email', 'to'],
sentAt: [...existing, 'sent at (pst)', 'sent at (utc)'],
opened: ['open', 'opened', 'is opened', 'was opened'],
clicked: ['click', 'clicked', 'is clicked'],
replied: ['replied', 'reply', 'is replied'],
```

### Boolean Filtering Logic
```typescript
// Instead of checking for openedAt timestamp:
const openedValue = columnMapping.opened 
  ? row[columnMapping.opened]?.toLowerCase().trim() 
  : null;

// Skip if not opened
if (openedValue !== 'true') continue;

// Use sentAt as the opened timestamp (best available)
const openedAt = columnMapping.sentAt 
  ? row[columnMapping.sentAt]?.trim() 
  : new Date().toISOString();
```

### Matching Logic (Unchanged)
The matching by email+subject against `apollo_email_activities` remains the same - we just change how we identify which rows to process.

## Expected Result

After import:
- **856 rows** in your CSV
- Filter to rows where `Open = true` (e.g., ~200+ opened emails)
- Match those against your **1,643 records** in `apollo_email_activities`
- Update `opened_at`, `open_count`, `status` for matched records
- Also sync `email_opened_at` in `company_communications`

## Files to Modify
1. `src/lib/apollo/importOpenedEmails.ts` - Core logic updates
2. `src/components/communications/ApolloEngagementImportDialog.tsx` - UI updates

