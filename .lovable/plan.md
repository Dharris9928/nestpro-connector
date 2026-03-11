

# Enhance Apollo Import Matching with Name + Email Reasoning

## Problem
The current Apollo import matching logic relies on a narrow set of identifiers:
1. Apollo Activity ID (exact match)
2. Email + Subject combination
3. Email only (when exactly one match exists)

Contact **name** (first/last name) is available in both the Apollo API data and CSV exports but is completely ignored during matching. This causes missed matches and low confidence scores when Apollo IDs are missing or email addresses appear multiple times.

Additionally, there is no visible **reasoning** shown to the user explaining *why* a record was matched or skipped.

## Solution

### 1. Add Name Columns to CSV Engagement Import (`src/lib/apollo/importOpenedEmails.ts`)

- Add `firstName` and `lastName` to `APOLLO_COLUMN_MAPPINGS` with common Apollo CSV variations: `"first name"`, `"contact first name"`, `"first_name"`, etc.
- Add `firstName` and `lastName` fields to the `OpenedEmailRow` interface
- Update `parseOpenedEmails()` to extract name fields from CSV rows
- Add a `matchReason` field to `MatchedRecord` to explain why each match was made

### 2. Enhance Matching Algorithm (`matchOpenedEmails()`)

Add a new matching tier between email+subject and email-only:

```text
Priority 1: Apollo ID (100% confidence) -- unchanged
Priority 2: Email + Subject (85%) -- unchanged  
Priority 3: Email + Subject fuzzy (75%) -- unchanged
Priority 4: Email + Name match (70%) -- NEW
Priority 5: Email only, single candidate (60%) -- unchanged
Priority 6: Email only, name disambiguates (55%) -- NEW
```

**Priority 4 (new)**: When multiple DB records share the same email, use first/last name from the CSV to find the correct contact record. If a name match is found, confidence is 70%.

**Priority 6 (new)**: When email-only matching finds multiple candidates (currently skipped entirely), use name to disambiguate and pick the best one at 55% confidence.

Each match will include a `matchReason` string explaining the logic, e.g.:
- "Matched by Apollo ID (exact)"
- "Matched by email + subject line"
- "Matched by email; name 'Tommy Nawa' confirmed match"
- "Matched by email only (single record for this address)"

### 3. Add Name Column Mapping to Engagement Import UI (`ApolloEngagementImportDialog.tsx`)

- Add First Name and Last Name selectors in the "Matching Fields" section
- Pass name fields through to `parseOpenedEmails()`
- Display `matchReason` in the preview table so users can see why each row was matched

### 4. Enhance API Import Matching (`ApolloEmailImportDialog.tsx`)

The API-based import already has contact name data from Apollo (`email.contact.firstName`, `email.contact.lastName`). Update the duplicate detection block (lines 461-465) to:
- When `alreadyImportedIds.has(email.apolloId)` triggers, also verify the contact name matches before confirming it as a true duplicate
- Store match reasoning in the `apollo_metadata` JSONB field for audit trail
- When doing the engagement upsert (from the approved plan), use name as an additional verification signal

### 5. Add `matchReason` to the Preview Table

In both import dialogs' preview/results steps, add a "Match Reason" column showing the human-readable explanation of how each record was matched. This gives users transparency into the AI's decision-making.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/apollo/importOpenedEmails.ts` | Add name columns to mappings, add name fields to interfaces, enhance matching with name-based tiers, add `matchReason` field |
| `src/components/communications/ApolloEngagementImportDialog.tsx` | Add First/Last Name column selectors, display match reasoning in preview table |
| `src/components/communications/ApolloEmailImportDialog.tsx` | Use contact name in duplicate verification, store match reasoning in metadata |

## Technical Details

### Name Matching Logic
- Normalize names: `trim()`, `toLowerCase()`
- Compare first+last name from CSV against contact record's first/last name in the DB
- Use exact match (not fuzzy) since names in Apollo exports should be consistent with what was imported

### Match Reason Examples
| Scenario | Reason String |
|----------|---------------|
| Apollo ID exact | "Exact Apollo ID match" |
| Email + Subject | "Email and subject line match" |
| Email + Name | "Email matches; contact name 'Ken Aucoin' confirms identity" |
| Email only (1 candidate) | "Email matches single database record" |
| Email + Name disambiguates | "Email matches multiple records; name 'Tommy Nawa' used to disambiguate" |
| Unmatched | "No matching record found for email or name" |

