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

`calculateNextRun(timing)` in `schedules.ts` returns the next concrete `Date` for:

- `daily` — daily at `HH:mm`
- `weekly` — at `HH:mm` on selected `days[]` (0=Sun..6=Sat), wraps to next week
- `once` — at the absolute date if still in the future
- `cron` — placeholder validation only; intended to use `cron-parser`

When a schedule toggles off, `nextRunAt` is cleared. When toggled on, it is recomputed.

## Why these choices

- **Discriminated unions over generic `config: any`** make the builder UI and Zod schemas trivially exhaustive — adding a new trigger type fails the typechecker until every step is updated.
- **Scene = list of device commands**, no conditions. Scenes are deterministic, automations are reactive — keeping them separate avoids overloading either model.
- **Manual `trigger` mutation** is essential for testing automations without waiting for a real event. Locked behind `automation:execute`.

## Critical files

```
server/trpc/routers/automation/index.ts
server/trpc/routers/{scenes,schedules}.ts
src/components/automation/{AutomationBuilder,SceneBuilder}.tsx
src/app/(dashboard)/dashboard/automation/page.tsx
```
