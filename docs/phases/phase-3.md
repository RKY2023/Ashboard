# Phase 3 — Automation Engine

Triggers, conditions, and actions composed into automations. Scenes for one-tap state changes. Schedules for time-based execution.

## What shipped

### Routers
- `server/trpc/routers/automation/index.ts` — CRUD on automations, plus `enable`, `disable`, `trigger` (manual run), `executionHistory`.
- `server/trpc/routers/scenes.ts` — scene CRUD, activate, reorder, list-by-room.
- `server/trpc/routers/schedules.ts` — schedule CRUD, toggle, `runNow`, internal `nextRunAt` calculator covering daily/weekly/once/cron.

### Components
- `src/components/automation/AutomationBuilder.tsx` — three-section builder (triggers / conditions / actions) with per-step forms keyed by type. Each item has a stable `id` so reordering and partial updates work.
- `src/components/automation/SceneBuilder.tsx` — pick devices, choose per-device commands and target values (brightness slider, color temp, lock state) using each device's `capabilities` array.

### Pages
- `src/app/(dashboard)/dashboard/automation/page.tsx` — tabbed page covering Automations / Scenes / Schedules with shared search + add-new affordance.

## Trigger / condition / action types

```ts
Trigger = device_state | time | sun | webhook | manual
Condition = device_state | time_range | day_of_week | sun_position | mode
Action = device_control | scene | delay | notification | webhook
```

The Zod schemas live in `server/trpc/routers/automation/index.ts`. The frontend `AutomationBuilder` mirrors the same union types so the mutation accepts the form payload directly.

## Permissions

| Permission | Grants |
|------------|--------|
| `automation:read` | List & view automations, scenes, schedules |
| `automation:write` | Create / update / configure |
| `automation:delete` | Remove |
| `automation:execute` | Manually fire `trigger` / `runNow` / scene `activate` |

Splitting `execute` from `write` lets a household member fire an automation without being able to alter its rules.

## Permission naming gotcha

Permission strings for automation are **singular** (`automation:read`), not plural like `devices:*`. See [`memory/feedback_permission_naming.md`](../../) — keep this in sync when extending `Permission`, `ROLE_PERMISSIONS`, `PERMISSION_GROUPS`, and `getPermissionLabel`.

## Schedule semantics

`nextRunAt(timing)` (shared helper at `server/jobs/lib/nextRunAt.ts`, used by both the schedules router and the worker) returns the next concrete `Date` for:

- `daily` — daily at `HH:mm`
- `weekly` — at `HH:mm` on selected `days[]` (0=Sun..6=Sat), wraps to next week
- `once` — at the absolute date if still in the future
- `cron` — parsed via `cron-parser` honoring `timing.timezone`

When a schedule toggles off, `nextRunAt` is cleared. When toggled on, it is recomputed.

## Worker (`pnpm worker`)

`server/jobs/worker.ts` is the long-running entry point that drains Redis-backed BullMQ queues. It owns three things:

- **Producer** (`server/jobs/producer.ts`) — every 30s, finds `schedules` with `nextRunAt <= now + 60s`, atomically claims each row by `$unset`-ing `nextRunAt`, and pushes a `schedule:run` job onto BullMQ. The processor recomputes the real `nextRunAt` after running.
- **Schedule processor** (`server/jobs/processors/runSchedule.ts`) — dispatches the schedule's action: `device_control` publishes via MQTT + persists state, `scene` runs the shared scene executor, `automation` enqueues an `automation:run` job.
- **Automation processor** (`server/jobs/processors/runAutomation.ts`) — iterates the automation's `actions[]` via `runAutomationActions`, supporting `device_control`, `scene`, `delay`, `notification` (fan-out to all household members), and `webhook` (`fetch` to the configured URL).

The router-side mutations `schedules.runNow` and `automation.trigger` now enqueue jobs through `getScheduleQueue()` / `getAutomationQueue()` instead of running inline — both Next.js and the worker share the same queue.

**Condition evaluator** (`server/jobs/lib/evaluateConditions.ts`) — `runAutomation` now short-circuits when conditions don't match. Implemented:

- `device_state` — load device, compare `state[property]` with `eq|ne|gt|lt|gte|lte`
- `time_range` — current time within `HH:mm`–`HH:mm` (wraps midnight)
- `day_of_week` — current day in `days[]`
- `mode` — current security mode equals `mode`
- `sun_position` — pass-through; needs household lat/lon + sun calc (deferred)

Manual `automation.trigger` mutations bypass conditions intentionally — the user explicitly asked for the run.

## Why these choices

- **Discriminated unions over generic `config: any`** make the builder UI and Zod schemas trivially exhaustive — adding a new trigger type fails the typechecker until every step is updated.
- **Scene = list of device commands**, no conditions. Scenes are deterministic, automations are reactive — keeping them separate avoids overloading either model.
- **Manual `trigger` mutation** is essential for testing automations without waiting for a real event. Locked behind `automation:execute`.

## Critical files

```
server/trpc/routers/automation/index.ts
server/trpc/routers/{scenes,schedules}.ts
server/jobs/{worker,producer,queues}.ts
server/jobs/lib/{nextRunAt,publishCommand,runScene,runAutomationActions}.ts
server/jobs/processors/{runSchedule,runAutomation}.ts
src/components/automation/{AutomationBuilder,SceneBuilder}.tsx
src/app/(dashboard)/dashboard/automation/page.tsx
```
