# Phase 8 — Reporting & Polish

Cross-domain KPIs, CSV exports, the user-management page, and a refactor of the main dashboard so it pulls live data instead of placeholders.

## What shipped

### Reports router (`server/trpc/routers/reports.ts`)
- `kpis` — single round-trip aggregate for the dashboard. Returns:

  ```ts
  {
    devices:    { total, online },
    energy:     { todayKwh, todayCost },
    security:   { todayEvents, criticalOpen },
    finance:    { monthIncome, monthExpense, net },
    grocery:    { total, expiringSoon, lowStock },
    recipes:    { total },
    automations:{ enabled }
  }
  ```

  All seven domain queries fan out via `Promise.all` so the wall-clock cost is bounded by the slowest one.
- `exportTransactions({ startDate?, endDate? })` — flat row array suitable for CSV: `Date, Type, Amount, Currency, Description, Payee, Tags`.
- `exportDeviceActivity({ startDate?, endDate?, limit })` — energy reading rows: `Timestamp, DeviceId, Power, Energy, Cost`.

CSV is generated **client-side** on download (`src/app/(dashboard)/dashboard/reports/page.tsx`). Returning an array via tRPC keeps caching/auth boring; the browser turns it into a `text/csv` blob and triggers `download`.

### Pages
- `src/app/(dashboard)/dashboard/reports/page.tsx` — sectioned KPI grid (Home Automation / Security / Finance / Grocery & Recipes) plus an "Exports" panel with one-click CSV downloads.
- `src/app/(dashboard)/dashboard/users/page.tsx` — household members list with role badges (owner/admin/member/guest), invite modal, and remove for non-owners. Wires into the existing `users.invite` / `users.remove` mutations from Phase 1.

### Dashboard refactor (`src/app/(dashboard)/dashboard/page.tsx`)
Replaced the hardcoded "12 devices, 24.5 kWh, $1,245" demo content with live data:
- Calls `reports.kpis`, `security.currentMode`, `energy.summary({ range: 'week' })`, `groceries.expiring({ days: 7 })`, `notifications.list({ isRead: false })` in parallel via React Query.
- Top row: 4 stat cards linked to their dashboards (Devices / Energy / Security / Net month).
- Body: 7-day energy line chart, pantry-status tile with the next-3-expiring items.
- Header: live "X unread" pill linking to `/dashboard/notifications` when `unread > 0`.

## Permissions

| Permission | Grants |
|------------|--------|
| `reports:read` | View KPI dashboard |
| `reports:export` | Run CSV export endpoints |

These already existed in `Permission` from Phase 1 — Phase 8 just consumes them.

## Why these choices

- **Single `kpis` endpoint over a-query-per-card** keeps the dashboard a single render. Each card already has a fallback skeleton via the shared `loading` flag, so users don't see a staggered shower of values.
- **CSV in the browser** dodges a binary streaming endpoint, content-disposition headers, and auth cookies for download URLs. The trade-off (max ~10k rows in memory) is fine for personal-scale ERP.
- **Dashboard cards are `<Link>`s** so KPIs are a navigation surface, not just a passive readout — the most common follow-up to "$1,245 expense" is "where did it go?".
- **No automatic dashboard widget framework.** The plan mentions a generic widget grid; keeping the layout hand-rolled keeps the surface small and avoids over-abstracting before there's a second consumer.

## Polish & build hygiene

- `npx tsc --noEmit` passes on the full repo across all 8 phases.
- `npx next lint` reports only pre-existing warnings (unused vars and `console.log` in `mqtt`/`websocket` infrastructure files); no warnings introduced by Phase 4–8.
- Sidebar registry now includes every dashboard route added in Phases 4–8, so nav highlight + active-state logic works without extra wiring.

## Critical files

```
server/trpc/routers/reports.ts
src/app/(dashboard)/dashboard/page.tsx           (refactored)
src/app/(dashboard)/dashboard/reports/page.tsx
src/app/(dashboard)/dashboard/users/page.tsx
```
