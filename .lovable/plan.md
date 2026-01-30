

# Upload Log - Batch Tracking & Rollback System

## Overview

Add an "Upload Log" section to the Settings > Data tab that provides:
1. Clear visibility into all data uploads/imports with batch tracking
2. Ability to rollback problematic imports to avoid duplicate data
3. Prevention of re-upload issues

## Location in UI

**Settings Page > Data Tab** - New "Upload Log" card positioned after the current admin tools

```text
Settings > Data Tab Layout:
┌──────────────────────────────────────────────┐
│ Database Management Improved                 │
├──────────────────────────────────────────────┤
│ Admin Tools (Duplicates, Merge)              │
├──────────────────────────────────────────────┤
│ ★ NEW: Upload Log                            │  ← Clearly labeled
│   - View all import batches with file names  │
│   - See success/fail/duplicate counts        │
│   - Rollback button for problematic imports  │
├──────────────────────────────────────────────┤
│ Data Warehouse Sync                          │
└──────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Database Schema Changes

**1.1 Enhance `import_export_logs` table:**

| New Column | Type | Purpose |
|------------|------|---------|
| `batch_id` | UUID | Unique identifier for each import session |
| `file_name` | TEXT | Original uploaded filename |
| `rollback_available` | BOOLEAN | Whether rollback is possible (default: true) |
| `rolled_back_at` | TIMESTAMPTZ | When rollback was performed |
| `rolled_back_by` | UUID | User who performed rollback |
| `affected_tables` | TEXT[] | Tables modified by this import |

**1.2 Add tracking columns to data tables:**

Add `import_batch_id` (UUID, nullable) to:
- `companies`
- `contacts`
- `company_communications`
- `apollo_email_activities`

**1.3 Add rollback support for engagement updates:**

Add `previous_engagement_values` (JSONB) to `apollo_email_activities` to store original field values before updates.

### Phase 2: New Utility Files

**2.1 Create `src/lib/import/batchTracking.ts`:**

```text
Functions:
- generateBatchId() → UUID
- createImportLog(batchId, fileName, tables) → void
- updateImportLog(batchId, stats) → void
```

**2.2 Create `src/lib/import/rollbackImport.ts`:**

```text
Functions:
- rollbackImport(batchId) → Promise<RollbackResult>
  ├── Delete created records (WHERE import_batch_id = batchId)
  ├── Restore updated records from previous_engagement_values
  ├── Update import_export_logs (rolled_back_at, rolled_back_by)
  └── Return success/failure stats
```

### Phase 3: Update Import Dialogs

Each import dialog will be updated to:
1. Generate a `batch_id` at import start
2. Pass `import_batch_id` when inserting records
3. Store filename in import log
4. For engagement updates: Capture original values before updating

**Files to modify:**

| Import Dialog | Records Created | Changes |
|---------------|-----------------|---------|
| `ImportDialog.tsx` (Companies) | companies | Add batch_id |
| `AIImportDialog.tsx` | companies, contacts | Add logging + batch_id |
| `ImportContactsDialog.tsx` | contacts, companies | Add batch_id |
| `ImportContactsDialogEnhanced.tsx` | contacts, companies | Add batch_id |
| `ApolloContactImportDialog.tsx` | contacts, companies | Add batch_id |
| `ApolloCSVImportDialog.tsx` | companies, contacts | Pass batch_id to `importApolloData()` |
| `ApolloEmailImportDialog.tsx` | communications, contacts, companies | Add batch_id |
| `ApolloEngagementImportDialog.tsx` | (updates) apollo_email_activities | Add logging + capture previous values |

**Also update:**
- `src/lib/prospecting/importApolloCSV.ts` - Accept batchId parameter

### Phase 4: Create Upload Log Component

**4.1 Create `src/components/settings/UploadLogViewer.tsx`:**

A dedicated component for Settings > Data tab with:

**Features:**
- Card with title "Upload Log" and Upload icon
- Search by filename, table, or user
- Filter by: All, Imports Only, Exports Only
- Status filter: All, Active, Rolled Back, Failed

**Table Columns:**
| Column | Description |
|--------|-------------|
| Date & Time | When import occurred |
| File Name | Original uploaded filename (new!) |
| User | Who performed the import |
| Type | Import/Export with icon |
| Table(s) | Which tables were affected |
| Results | Success/Failed/Duplicates counts |
| Status | Active / Rolled Back badge |
| Actions | Rollback button (if available) |

**Rollback Flow:**
1. User clicks "Rollback" button
2. Confirmation dialog appears with warning
3. On confirm: Call `rollbackImport(batchId)`
4. Show success toast with stats
5. Refresh the log view
6. Invalidate related query caches

### Phase 5: Update Settings Page

**5.1 Modify `src/pages/Settings.tsx`:**

Add the UploadLogViewer component to the Data tab:

```text
<TabsContent value="data">
  {userData?.role === 'admin' && (
    <>
      <DatabaseManagementImproved />
      <Card>Admin Tools...</Card>
      
      {/* NEW: Upload Log */}
      <UploadLogViewer />
      
      <DataWarehouseSync />
    </>
  )}
</TabsContent>
```

**5.2 Remove from Logs tab:**

The `ImportExportLogsViewer` component will be consolidated into the new `UploadLogViewer`, so it can be removed from:
- Settings > Security tab (line 281)
- Settings > Logs tab can reference the Data tab for detailed upload logs

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `src/lib/import/batchTracking.ts` | Batch ID generation and log management |
| `src/lib/import/rollbackImport.ts` | Rollback functionality |
| `src/components/settings/UploadLogViewer.tsx` | Main Upload Log UI component |

### Modified Files
| File | Changes |
|------|---------|
| Database migration | Add new columns to tables |
| `src/pages/Settings.tsx` | Add UploadLogViewer to Data tab |
| `src/components/companies/ImportDialog.tsx` | Add batch tracking |
| `src/components/companies/AIImportDialog.tsx` | Add batch tracking + logging |
| `src/components/contacts/ImportContactsDialog.tsx` | Add batch tracking |
| `src/components/contacts/ImportContactsDialogEnhanced.tsx` | Add batch tracking |
| `src/components/contacts/ApolloContactImportDialog.tsx` | Add batch tracking |
| `src/components/prospecting/ApolloCSVImportDialog.tsx` | Add batch tracking |
| `src/lib/prospecting/importApolloCSV.ts` | Accept batchId param |
| `src/components/communications/ApolloEmailImportDialog.tsx` | Add batch tracking |
| `src/components/communications/ApolloEngagementImportDialog.tsx` | Add logging + previous values |

## Rollback Behavior

**For Created Records (companies, contacts, communications):**
- Records with matching `import_batch_id` are deleted

**For Updated Records (engagement data):**
- Original values restored from `previous_engagement_values` JSONB
- Preserves any changes made after the import

**Constraints:**
- Rollback available for 30 days after import
- Admin permission required for rollback
- Cannot rollback if records have been manually modified (warning shown)
- Rollback button hidden after rollback is performed

## Benefits

1. **Complete Visibility**: See every import with filename, user, and results
2. **Safe Re-uploads**: Rollback problematic imports before re-uploading
3. **Duplicate Prevention**: Each record linked to its source batch
4. **Audit Compliance**: Full history with timestamps and user attribution
5. **Centralized Location**: All upload management in Settings > Data

