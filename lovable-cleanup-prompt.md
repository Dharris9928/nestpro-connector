# Prompt for Lovable: Code Cleanup & Query Trimming Pass

Paste the section below into Lovable. These are smaller, lower-risk cleanups
than the architectural pass in `lovable-optimization-prompt.md` — mostly
dead code removal and trimming oversized queries. Explain your reasoning as
you go.

---

I want to clean up some dead code and trim oversized queries in this CRM,
without changing any user-facing behavior. Please make the following
changes:

## 1. Remove debug logging left in production code

**Where:** `src/hooks/useImpersonation.ts` (several `console.log` calls),
`src/lib/contacts/logContactAccess.ts` (one `console.log`).

**What to do:** Remove these `console.log` statements entirely. If any of
them were guarding against a real error condition, convert that one to a
proper `console.error` or toast instead of silently dropping it — but the
rest are just leftover debug output and should go.

## 2. Stop logging full payloads in the Apollo edge function

**Where:** `supabase/functions/apollo-company-search/index.ts` — around the
`JSON.stringify(searchPayload, null, 2)` call.

**Problem:** This logs the entire search payload on every single request,
which bloats edge function logs and adds unnecessary overhead on a
function that may be called frequently.

**What to do:** Remove the full payload dump. If logging is needed for
debugging, log only a short summary (e.g. a couple of key fields) and only
when an error occurs, not on every successful call.

## 3. Find and remove the dead duplicate import dialog

**Where:** `src/components/contacts/ImportContactsDialog.tsx` vs
`src/components/contacts/ImportContactsDialogEnhanced.tsx`.

**What to do:** Grep the codebase for where each is actually imported/used
in routes or parent components. Whichever one is not referenced anywhere
(or is superseded by the other), delete it. If both are used in different
places, tell me where, since that may be intentional and not actually dead
code. Also check for similar overlapping pairs in the companies and
communications import flows (e.g. Import vs AIImport dialogs) and report
back if you find any that look like leftover duplicates rather than
intentionally distinct features.

## 4. Narrow `select('*')` to explicit columns on high-traffic queries

**Where:** The main list queries in `src/pages/Companies.tsx`,
`src/pages/Contacts.tsx`, and `src/pages/Opportunities.tsx` (and any other
page-level list query using `.select('*')`).

**Problem:** These queries pull every column on every row, including ones
the list/grid views never render (e.g. long text/notes fields, internal
tracking columns). That's wasted payload on every list load.

**What to do:** Replace `.select('*')` with an explicit column list
containing only what the grid/table view actually renders and what's
needed for row actions (edit, navigate, etc.). Leave the single-record
fetches (e.g. opening a record's edit dialog) using `select('*')` since
those genuinely need full detail — this is specifically about the list
queries that hydrate many rows at once.

## 5. Replace `any` types with real types

**Where:** Codebase-wide — `npx eslint .` currently reports 719
`@typescript-eslint/no-explicit-any` violations, heavily concentrated in
the Supabase edge functions (`supabase/functions/search-contacts-by-name`,
`send-activity-assignment-notification`, `send-approval-request-notification`,
`send-approval-status-notification`, `send-deletion-request-notification`,
`send-notification`, `send-password-reset-notification`,
`validate-presentation-token`, `verify-email-domain`,
`verify-reset-code/index.ts`), but also present throughout `src/`.

**Problem:** `any` defeats TypeScript's type checking at that call site —
`tsc --noEmit` currently passes clean, but that's misleading, because large
parts of the codebase have opted out of type checking rather than actually
being type-safe. Bugs that should be caught at compile time (wrong field
name, wrong shape passed to a function) slip through silently wherever
`any` is used.

**What to do:** Work through these in batches, starting with the edge
functions since they're a smaller, self-contained set. For each `any`:
infer the real type from how the value is used (e.g. a webhook payload
shape, a Supabase row type, a function parameter) and replace it with an
explicit interface/type, or `unknown` plus a type guard if the shape is
genuinely dynamic. Don't do a mechanical `as any` → `as unknown as X` cast
that just silences the linter without adding real safety — actually type
the data. Re-run `npx eslint .` after each batch to confirm the count is
dropping, and run `npx tsc --noEmit` to make sure no new type errors were
introduced.

## 6. Fix missing `useEffect`/`useMemo`/`useCallback` dependencies

**Where:** Codebase-wide — `npx eslint .` reports 40
`react-hooks/exhaustive-deps` warnings.

**Problem:** A missing dependency means the hook can run with stale data
from an earlier render — these are a common source of "it doesn't update
when X changes" bugs that only show up intermittently.

**What to do:** Go through each warning individually rather than blanket-
adding every suggested dependency, since some are likely intentional
(e.g. an effect that should only run once on mount, like the real-time
subscription setup in `Companies.tsx`). For each one: if the missing
dependency is genuinely needed, add it; if the effect is intentionally
mount-only, add an inline comment explaining why and use an
`// eslint-disable-next-line react-hooks/exhaustive-deps` with a one-line
reason instead of silently leaving the warning. Flag any case where you're
not sure which it is rather than guessing.

---

Already done outside of Lovable (for context, don't redo):
- Removed the duplicate enriched/not-enriched query branches in
  `src/pages/Companies.tsx`.
- Global QueryClient cache defaults, Vite vendor chunking, and dynamic
  `import()` for `@e965/xlsx` (see `lovable-optimization-prompt.md` for
  the larger architectural items still pending: server-side pagination,
  RLS helper functions, and table row memoization).
