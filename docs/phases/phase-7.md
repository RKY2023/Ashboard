# Phase 7 — Climate & Notifications

HVAC zone control with per-zone schedules, plus a per-user notification inbox and configurable alert rules.

## What shipped

### Climate router (`server/trpc/routers/climate.ts`)
- `listZones` — all active climate zones
- `createZone` / `updateZone` / `deleteZone` (soft delete via `isActive: false`)
- `setTemperature(zoneId, targetTemperature)` — one-shot adjustment for the +/- buttons
- Sub-router `schedules`:
  - `listForZone(zoneId)`
  - `upsert` — create or replace a schedule (name + entries + isEnabled)
  - `delete`

A `ClimateScheduleEntry` is `{ dayOfWeek (0..6), startTime "HH:mm", targetTemperature, mode }`.

### Notifications router (`server/trpc/routers/notifications.ts`)
- `list({ isRead?, page, pageSize })` — paginated, returns total + unread count + items
- `markRead(notificationId)` / `markAllRead()` / `delete(notificationId)`
- `create` — manually push a notification (locked behind `notifications:manage`)
- Sub-router `rules`:
  - `list` — returns `lastFiredAt`, `lastEvaluatedAt`, `lastValue`, `cooldownMinutes` so the UI can show rule health
  - `upsert` — typed condition (`{ metric, op: gt|lt|gte|lte|eq|ne, threshold }`) with cooldown
  - `delete`
  - `metrics` — returns the available metric names so the rule builder can populate a dropdown

### Pages
- `src/app/(dashboard)/dashboard/climate/page.tsx` — zone tiles with current target temp, +/- adjusters, mode selector (off/heat/cool/auto/fan), and a create-zone modal.
- `src/app/(dashboard)/dashboard/notifications/page.tsx` — All/Unread filter, mark-all-read button, severity-styled list with mark-read and delete actions.

### Sidebar
Added `Climate` and `Notifications` entries in `src/components/layouts/Sidebar.tsx` (and dropped the unused `Thermometer` import after switching to `Snowflake`).

## Schemas (new in this phase)

```ts
ClimateZone {
  name,
  thermostatDeviceIds: ObjectId[],
  targetTemperature: number,
  unit: 'celsius' | 'fahrenheit',
  mode: 'off' | 'heat' | 'cool' | 'auto' | 'fan',
  humidity?,
  isActive
}

ClimateSchedule {
  zoneId, name,
  entries: ClimateScheduleEntry[],
  isEnabled
}

AlertRule {
  name,
  resourceType: ResourceType,
  condition: { metric: string; op: 'gt'|'lt'|'gte'|'lte'|'eq'|'ne'; threshold: number },
  channels: ('app' | 'email' | 'push' | 'sms')[],
  cooldownMinutes?: number,
  lastFiredAt?: Date,
  lastEvaluatedAt?: Date,
  lastValue?: number,
  isEnabled
}
```

`Notification` itself was already declared in Phase 1.

## Permissions

| Permission | Grants |
|------------|--------|
| `climate:read` | View zones and schedules |
| `climate:write` | Create / update / delete zones and schedules, change target temp/mode |
| `notifications:read` | View own notifications, mark read, delete |
| `notifications:manage` | Create notifications, manage alert rules |

Both new permission groups were added to `Permission`, `ROLE_PERMISSIONS`, `PERMISSION_GROUPS`, and `getPermissionLabel` in lock-step.

## Why these choices

- **Zone references thermostat devices, not the inverse.** A user might have several "smart vents" assigned to one zone; modelling at the zone level matches how people think about HVAC and lets the orchestration logic average targets across the group.
- **Schedule entries are flat (one row per day-of-week / time)** rather than hierarchical "weekday/weekend" presets — easier to render in a grid, easier to add an exception for one day, no extra normalisation step.
- **Rules use a small `{ metric, op, threshold }` DSL** so any metric exposed by the registry (`server/jobs/lib/metrics.ts`) can be alerted on without changing the rule schema. Adding a new metric is a one-line entry in `METRICS`.
- **Notifications are per-user inside a household.** The same security event might generate one notification for the on-call household member but not the others.

## AlertRule evaluator (`pnpm worker`)

`server/jobs/processors/evaluateAlerts.ts` runs once a minute via a BullMQ repeatable job (registered in `worker.ts`). For each enabled rule across all households it:

1. Skips if `now - lastFiredAt < cooldownMinutes` (default 60 minutes).
2. Loads the metric value from `server/jobs/lib/metrics.ts` (`energy.todayKwh`, `pantry.expiringSoon`, `security.criticalUnack`, …).
3. Compares with `op`/`threshold` (`server/jobs/lib/evaluateRule.ts`).
4. If the predicate fires, calls `dispatchNotification()` (`server/notifications/dispatch.ts`) which fans out to every household member via the `app` channel and stubs `email`/`push`/`sms`.
5. Stamps `lastEvaluatedAt`, `lastValue`, and (on fire) `lastFiredAt` so cooldown takes effect.

Adding a new alert metric is a one-line entry in `METRICS` — the rule builder pulls the list via `notifications.rules.metrics`.

## Critical files

```
server/trpc/routers/climate.ts
server/trpc/routers/notifications.ts
server/jobs/lib/{metrics,evaluateRule}.ts
server/jobs/processors/evaluateAlerts.ts
server/notifications/dispatch.ts
server/notifications/channels/{app,stubs}.ts
src/app/(dashboard)/dashboard/climate/page.tsx
src/app/(dashboard)/dashboard/notifications/page.tsx
src/components/layouts/Sidebar.tsx
```
