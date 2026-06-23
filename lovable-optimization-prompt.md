# Prompt for Lovable: Performance & Storage Optimization Pass

Paste the section below into Lovable. It covers the higher-risk items that
touch multiple views/components and are best done with Lovable's full
context of the live schema and UI, rather than blind edits.

---

I want to optimize this CRM for speed and database efficiency without
changing any user-facing behavior. Please make the following changes, and
explain your reasoning for each as you go so I understand the tradeoffs:

## 1. Convert the Companies list to true server-side pagination

**Where:** `src/pages/Companies.tsx`

**Problem:** The `companies` query currently has no `.range()`/`.limit()` —
it fetches every row matching the current filters, then the UI slices that
array client-side for `paginatedCompanies`. As the companies table grows,
this means every page load pulls the *entire* filtered dataset over the
wire just to show 50 rows, and resorts/refilters happen in JS.

**Why this matters:** Today it works fine because the dataset is small.
It will silently get slower in proportion to data growth, with no error or
warning — the kind of thing that's expensive to retrofit when it's already
hurting.

**What to do:** Move pagination, sorting, and as many filters as possible
into the Supabase query itself (`.range(start, end)`, `.order()`, and
`.eq()/.in()` clauses already mostly exist). Keep `filteredAndSortedCompanies`
as today's behavior ONLY for views that need the full dataset in memory
(Kanban, Gallery, List, Hierarchy) — but cap those with a sane hard limit
(e.g. 500 rows) and show a banner if the filtered set exceeds it, rather
than silently fetching unbounded data. Grid/table view should use the new
server-paginated query exclusively.

## 2. Move RLS per-row subqueries into STABLE helper functions

**Where:** `supabase/migrations/` — RLS policies using inline `EXISTS (...)`
subqueries (most policies reference `team_memberships`, `user_roles`, or
`profiles` checks).

**Problem:** Postgres re-evaluates an inline `EXISTS` subquery for every row
scanned by a policy, every query. With ~140+ policies doing this, list
queries on large tables pay a real per-row cost.

**What to do:** Wrap the common checks (e.g. "is this user a manager of
this record's owner", "does this user have elevated access") in
`CREATE FUNCTION ... STABLE SECURITY DEFINER` helpers, and reference the
function in the policy instead of the inline subquery. Postgres can cache a
`STABLE` function's result within a single query plan more effectively than
re-planning a subquery per row. Please audit existing policies for ones
already doing this and follow the same pattern for the rest.

## 3. Memoize the big data-table rows

**Where:** `src/components/companies/CompanyTable.tsx`,
`src/components/contacts/ContactTable.tsx`,
`src/components/opportunities/OpportunitiesTable.tsx`

**Problem:** These tables map directly over rows in the parent render with
inline handler closures, so every parent re-render (e.g. typing in the
search box, toggling a filter) re-renders every visible row even though
most rows' data hasn't changed.

**What to do:** Extract a `<CompanyRow>` (etc.) component, wrap it in
`React.memo`, and ensure the callbacks passed to it (`onEdit`, `onSelect`,
etc.) are stable via `useCallback` in the parent so memoization actually
prevents re-renders rather than being defeated by new function references
every render.

## 4. Remove unused/duplicate import dialogs

**Where:** `src/components/contacts/ImportContactsDialog.tsx` vs
`ImportContactsDialogEnhanced.tsx` (and check for similar overlapping pairs
in companies/communications import flows).

**What to do:** Confirm which one is actually referenced from routes/pages
today (grep for imports), delete the unused one, and consolidate any logic
worth keeping into the surviving component.

---

Already done outside of Lovable (for context, don't redo):
- Global QueryClient defaults (staleTime/gcTime/refetchOnWindowFocus) in
  `src/App.tsx`.
- Vite `manualChunks` vendor splitting + dev-only sourcemaps in
  `vite.config.ts`.
- Dynamic `import()` for the `@e965/xlsx` library in Export/Import dialogs
  so it's not bundled into the initial page chunk.
- Deduplicated the enriched/not-enriched filter query in
  `src/pages/Companies.tsx`.
