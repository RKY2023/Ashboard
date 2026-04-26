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
  - `list` / `upsert` / `delete` — manage `AlertRule` documents that downstream workers will evaluate

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
  condition: Record<string, unknown>,
  channels: ('app' | 'email' | 'push' | 'sms')[],
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
- **Rules store `condition` as `Record<string, unknown>`** because the trigger semantics for an alert ("battery < 20" vs "expense > $X") differ wildly. The downstream rule evaluator interprets it; the schema doesn't lock us in.
- **Notifications are per-user inside a household.** The same security event might generate one notification for the on-call household member but not the others.

## Critical files

```
server/trpc/routers/climate.ts
server/trpc/routers/notifications.ts
src/app/(dashboard)/dashboard/climate/page.tsx
src/app/(dashboard)/dashboard/notifications/page.tsx
src/components/layouts/Sidebar.tsx
```
