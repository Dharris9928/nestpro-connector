# Performance & Storage Optimization Pass

Four scoped changes. No user-facing behavior changes. I'll explain tradeoffs inline as I work.

## 1. Server-side pagination for Companies list

**File:** `src/pages/Companies.tsx`

- Split into two queries keyed by active view:
  - **Grid/Table view** → new `companiesPageQuery` using `.select('*', { count: 'exact' })`, `.order(sortField, { ascending })`, `.range((page-1)*pageSize, page*pageSize - 1)`, and push all currently-client filters (search, industry, segment, status, region, enriched flag, perspective) into `.ilike()` / `.eq()` / `.in()` / `.not()` clauses on the server.
  - **Kanban / Gallery / List / Hierarchy views** → keep the in-memory `filteredAndSortedCompanies` path but add a hard cap (`.limit(500)`) and render a banner ("Showing first 500 of N — narrow filters to see the rest") when `count > 500`.
- Replace client-side `paginatedCompanies` slice with the server page directly; pagination controls drive `page` state that re-runs the query.
- Keep React Query keys including all filter/sort/page values so cache works correctly; set `placeholderData: keepPreviousData` to avoid table flicker on page change.

**Tradeoff:** search-as-you-type becomes a network hit per keystroke — mitigated by the existing `useDebounce` hook (confirm it's wired to the search input; if not, add 250ms debounce).

## 2. RLS helper functions to replace inline EXISTS subqueries

**Where:** new migration under `supabase/migrations/`

- Audit current policies via `pg_policies` to find recurring patterns. Expected reusable predicates:
  - `is_manager_of(_manager_id uuid, _owner_id uuid)` — wraps the `team_memberships` lookup.
  - `can_access_company_row(_company_id uuid)` — created_by/assigned_to/elevated check.
  - `can_access_contact_row(_contact_id uuid)` — via parent company.
  - Reuse existing `has_elevated_access`, `has_role`, `is_user_approved` where policies still inline them.
- Each helper: `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`. `STABLE` lets the planner cache results per query; `SECURITY DEFINER` avoids recursive RLS on the lookup tables.
- Rewrite policies on the heaviest tables first: `companies`, `contacts`, `opportunities`, `outreach_activities`, `company_communications`, `apollo_email_activities`. Drop + recreate each policy in the same migration to keep behavior identical.
- Migration will be presented for approval before running.

**Tradeoff:** `SECURITY DEFINER` helpers must be written carefully — they bypass RLS on the tables they read, so each one will only expose a boolean, never row data.

## 3. Memoize table rows

**Files:** `src/components/companies/CompanyTable.tsx`, `src/components/contacts/ContactTable.tsx`, `src/components/opportunities/OpportunitiesTable.tsx`

For each:
- Extract `<CompanyRow>` / `<ContactRow>` / `<OpportunityRow>` as a separate component in the same file (or sibling file) wrapped in `React.memo` with a custom comparator if needed (shallow compare on the row object + selected flag is usually enough).
- In the parent, wrap `onEdit`, `onDelete`, `onSelect`, `onRowClick`, etc. in `useCallback` with stable deps. Any object/array props (e.g. column config) memoized with `useMemo`.
- Verify selection state is passed as a primitive boolean per row (not the whole `selectedIds` Set) so unrelated rows don't invalidate.

**Tradeoff:** Slight code churn; memo only pays off when row count > ~50, which is the case here.

## 4. Remove duplicate import dialogs

**Files:** `src/components/contacts/ImportContactsDialog.tsx` vs `ImportContactsDialogEnhanced.tsx`

- `rg` for imports of both. Delete whichever is unreferenced. If both are referenced from different places, consolidate to the Enhanced one and update call sites.
- Same scan for companies/communications import pairs; if duplicates exist, same treatment.

## Out of scope (already done, per your note)

QueryClient defaults, Vite chunking, dynamic xlsx import, dedup of enriched filter query.

## Verification

- After each change: read relevant file(s) to confirm structure, run typecheck via the harness build.
- For pagination: manually page through in preview; confirm network panel shows ~50-row payloads.
- For RLS: re-run a representative `SELECT` from `companies` as a sales_rep user via `supabase--read_query` with role impersonation, confirm row count matches pre-migration.
- For memo: React DevTools Profiler is overkill for a verification pass — instead, add a temporary `console.count` in a row component, type in the search box, confirm count doesn't grow per keystroke for unrelated rows, then remove.
