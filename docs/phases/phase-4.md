# Phase 4 — Security & Energy

Security modes (arm/disarm presets), event timeline, energy ingestion, consumption analytics, and budgets.

## What shipped

### Routers
- `server/trpc/routers/security/index.ts`
  - `currentMode` — active preset for the household
  - `listModes` / `upsertMode` / `activateMode` / `disarm`
  - `listEvents` (filters: type, severity, ack, date range, pagination)
  - `recordEvent` — called by automation/devices to push new events
  - `acknowledge` — mark an event handled
  - `stats` — today/unacknowledged/critical-unacknowledged counts for cards
  - `cameras.{list,get,register,update,delete}` — sub-router for HLS camera registry
  - `access.{list,record}` — sub-router for the security access log; `recordAccess()` helper is also called from `activateMode` and `disarm` so arm/disarm events appear in the log automatically
- `server/trpc/routers/energy/index.ts`
  - `ingest` — write a reading (power W, energy kWh, optional cost)
  - `list` — paginated readings, optional device + date filters
  - `summary` — `$dateToString` aggregation bucketed by hour (range=day) or day (week/month/year)
  - `current` — latest reading per device + total realtime power
  - `listBudgets` / `upsertBudget` / `deleteBudget` — monthly limits with alert threshold

### Pages
- `src/app/(dashboard)/dashboard/security/page.tsx` — current-mode hero, preset switcher, disarm action, today/unack/critical stat cards, then a tabbed area: Events (severity-coloured timeline with acknowledge), Cameras (`CamerasTab` with lazy-loaded `HlsPlayer`), Access Log (`AccessLogTab` paginated table).
- `src/app/(dashboard)/dashboard/energy/page.tsx` — range selector (day/week/month/year), realtime/total/cost stat cards, recharts `LineChart` of consumption + per-device `BarChart`, budget list with over-threshold banner.

## Schemas

```ts
SecurityMode { name, mode: 'disarmed'|'home'|'away'|'night'|'vacation', deviceSettings, isActive }
SecurityEvent { type, severity, message, isAcknowledged, acknowledgedBy?, acknowledgedAt? }
Camera { name, hlsUrl, snapshotUrl?, roomId?, isActive, lastSeenAt? }
AccessLogEntry { actorId?, actorName?, deviceId?, deviceName?, action, detail?, at }

EnergyReading { deviceId?, timestamp, power: number /* W */, energy: number /* kWh */, cost? }
EnergyBudget { name, month, year, limitKwh, limitCost, alertThreshold /* % */ }
```

## Permissions

| Permission | Grants |
|------------|--------|
| `security:read` | View modes, events, stats |
| `security:arm` | Activate non-disarmed mode |
| `security:disarm` | Disarm or activate the disarmed mode |
| `security:manage` | Configure presets, record/ack events |
| `energy:read` | View readings, summaries, budgets |
| `energy:manage` | Ingest readings, manage budgets |

`security:arm` and `security:disarm` are split intentionally — a guest household member who can disarm to come in shouldn't necessarily be able to arm (committing the system to alert).

## Aggregation strategy

Energy `summary` uses MongoDB's `$dateToString` to bucket timestamps server-side:

- `range: 'day'` → `'%Y-%m-%dT%H:00'` (hourly)
- `range: 'week'|'month'|'year'` → `'%Y-%m-%d'` (daily)

This avoids returning thousands of raw readings to the client. Combined with the compound index `(householdId, timestamp)` declared in `indexes.ts`, the aggregation stays cheap.

## Why these choices

- **Single mode active at a time** (`isActive`) plus a disarm shortcut keeps the UX legible — no cascading "what does Home + Night together mean" questions.
- **Severity-tiered events** (`info | warning | alert | critical`) drive both colour and "critical open" stat without a separate priority field.
- **Budget threshold as percentage**, not absolute — survives a budget bump without re-tuning the alert.

## HLS player

`src/components/security/HlsPlayer.tsx` lazy-imports `hls.js` only when the browser doesn't natively play HLS (i.e. not Safari) — the ~150KB library stays out of the initial bundle and out of SSR. Native playback (`canPlayType('application/vnd.apple.mpegurl')`) is preferred so iOS / iPadOS get hardware-accelerated playback for free.

## Critical files

```
server/trpc/routers/security/{index,cameras,access}.ts
server/trpc/routers/energy/index.ts
src/components/security/{HlsPlayer,CamerasTab,AccessLogTab}.tsx
src/app/(dashboard)/dashboard/security/page.tsx
src/app/(dashboard)/dashboard/energy/page.tsx
```
