# Phase 1: Automation Engine + Floating AI Assistant

## Your choices locked in
1. **Both A + B** — floating notification panel AND conversational AI that can answer questions
2. **Bottom-right** placement
3. **Alongside** the top-nav bell (bell = history archive, floating widget = active/urgent + chat)
4. **AI can take actions** (reassign leads, mark reviewed, snooze alerts, trigger enrichment, etc.)

---

## What ships in Phase 1

### Part 1 — Automation Engine (backend)

**4 v1 flows only:**
1. **Hot lead detection** — every 15 min, find leads scoring P1 in last hour → notify assigned rep
2. **Stale opportunity alert** — daily 7am EST, opportunities with no activity in 14 days → notify owner
3. **Meeting follow-up** — every 30 min, meetings past scheduled date with no completion → notify owner
4. **Enrichment backfill** — hourly, top 50 unenriched companies by lead_score → run Apollo→Deepseek

**New tables:**
- `automation_rules` — rule config, mode (`live`/`dry_run`/`disabled`), schedule, safety limits, cost ceilings
- `automation_runs` — execution history, error_message, error_stack, error_category, fix_attempts JSONB, ai_calls_used, flagged_for_review
- `automation_action_log` — idempotency keyed by `(rule_id, target_id, dedupe_window)`
- `notification_preferences` — per-user toggles (default ON), quiet_hours, urgency thresholds

**Self-heal loop:** `automation-self-heal` edge function. After failure, Gemini analyzes error + recent runs, proposes one fix, retries. Hard cap 3 attempts → `flagged_for_review` + cron disabled + admin notification.

**Safety:** all writes go through `_shared/automationContext.ts` with `actor='automation:<rule_name>'`. Per-rule daily caps on rows touched, writes, and AI calls.

---

### Part 2 — Floating AI Assistant (bottom-right)

```text
┌─────────────────────────┐
│                         │
│      App content        │
│                         │
│                         │
│                    ┌──┐ │  ← collapsed: round button
│                    │🔴3│ │     with unread badge
│                    └──┘ │
└─────────────────────────┘

Click expands to:

┌─────────────────────────┐
│              ┌────────┐ │
│              │ Nest AI│ │
│              ├────────┤ │
│              │🔥 P1   │ │  ← Active alerts as cards
│              │  Lead  │ │     (Reassign | View | ✕)
│              ├────────┤ │
│              │⚠ Mtg   │ │
│              │  overdue│ │
│              ├────────┤ │
│              │💬 Chat │ │  ← Type to ask AI
│              │ "Who   │ │
│              │  needs │ │
│              │  follow│ │
│              │  up?"  │ │
│              └────────┘ │
└─────────────────────────┘
```

**Two modes in one widget:**

**Alerts mode (top section):**
- Live unread automation notifications as cards
- Each card: icon, title, 1-line context, inline action buttons
- Dismiss / Snooze / View record / Take suggested action
- Color-coded by urgency (P1 red, P2 amber, P3 blue)

**Chat mode (bottom section):**
- Persistent text input
- AI agent (Gemini via Lovable AI Gateway) with full CRM context
- Can answer questions: *"Show me my hot leads from this week"*, *"What meetings are overdue?"*
- Can take actions via tools: *reassign lead*, *mark notification reviewed*, *snooze alert*, *trigger enrichment for company X*, *create activity*
- Streams responses, renders markdown
- All AI actions require confirmation ("Reassign Lead #4521 to Sarah?" → Confirm/Cancel) and are logged to `ai_action_log`

**Visibility:**
- Pulse animation when new P1 alert arrives
- Toast bridge: P1 notifications also fire a sonner toast that scrolls to the widget on click
- Unread count badge on collapsed bubble (max "9+")
- Sound on P1 (toggleable in preferences)

**Lives alongside the existing top-nav bell** — bell stays as the full history/archive page (`/notifications`), widget is for active/urgent + conversation.

---

## What gets built (file map)

**Database:**
- 1 migration: 4 new tables + grants + RLS + triggers + seed default rules

**Edge functions:**
- `automation-runner` (cron entry point, dispatches to flow handlers)
- `automation-self-heal` (Gemini-powered error analyzer)
- `ai-assistant-chat` (streaming chat with tool-calling for actions)
- `_shared/automationContext.ts` (write wrapper with logging)

**Cron jobs (pg_cron, UTC documented as EST):**
- Every 15 min → hot lead flow
- Every 30 min → meeting follow-up flow
- Hourly → enrichment backfill
- `0 12 * * 1-5` UTC (7am EST weekdays) → stale opportunity digest

**Frontend:**
- `src/components/assistant/FloatingAssistant.tsx` — bubble + panel shell
- `src/components/assistant/AlertCard.tsx` — single notification card with actions
- `src/components/assistant/AssistantChat.tsx` — chat interface with streaming
- `src/components/assistant/AssistantActionConfirm.tsx` — tool-call confirmation dialog
- `src/hooks/useAutomationNotifications.ts` — realtime subscription to new notifications
- `src/hooks/useAssistantChat.ts` — chat state + AI streaming
- Mount once in `AppLayout.tsx` (alongside `<NotificationBell />`)
- Admin page: `src/pages/AutomationAdmin.tsx` — view rules, runs, errors, fix attempts, toggle live/dry_run/disabled

**Notification preferences:**
- Extend existing `NotificationSettings.tsx` with automation-type toggles + quiet hours + assistant sound toggle

---

## Out of scope for Phase 1
- Flows #5–10 (deferred to backlog)
- Email/Slack delivery
- User-configurable rule builder (admin toggle only, no UI to create new rules)
- Retry queues (cron re-runs on next cycle)
- Multi-step AI agent reasoning (single tool call per turn, with confirmation)
- Voice input on assistant

---

## Build order (so we can ship incrementally)

1. **Migration** (tables, grants, RLS, seed rules in `dry_run` mode) — *blocking, approve first*
2. **Automation runner + 1 flow** (hot lead detection) in dry_run → verify logs
3. **Flip to live**, add remaining 3 flows
4. **Self-heal loop** + admin page
5. **Floating widget shell** (alerts mode only) wired to realtime notifications
6. **AI chat mode** with read-only tools (query CRM)
7. **AI action tools** with confirmation flow
8. **Notification preferences UI** extension

Each step is verifiable before moving on.

---

## Technical details (for reference)

- All cron in `America/New_York` via `pg_cron`'s timezone support
- AI actions logged to new `ai_action_log` table (actor, action, target, payload, result, confirmed_by_user)
- Assistant chat uses Lovable AI Gateway with `google/gemini-2.5-flash` default
- Tool-calling pattern via AI SDK `tool()` with Zod schemas, `needsApproval: true` on mutations
- Realtime subscription on `notifications` table filtered by `user_id`
- Widget state (open/closed, last-seen-notification-id) in localStorage
- Backfill thresholds: 500 Apollo/day, 2000 Deepseek/day, 1000 Gemini/day (already agreed)

---

Ready to implement? Hit **Implement plan** and I'll start with the migration.
