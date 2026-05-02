# Phase Docs

Per-phase implementation summaries for the ERP-based home automation platform.

The high-level plan and roadmap lives in [`../ERP-Based Home Automation Software.md`](../ERP-Based%20Home%20Automation%20Software.md). Each file in this folder describes what shipped for one phase: routers, schemas, pages, components, and notable design decisions.

| Phase | Theme | Doc |
|-------|-------|-----|
| 1 | Foundation (auth, multi-tenant, RBAC) | [phase-1.md](phase-1.md) |
| 2 | Device Management (MQTT, WebSocket) | [phase-2.md](phase-2.md) |
| 3 | Automation Engine (rules, scenes, schedules) | [phase-3.md](phase-3.md) |
| 4 | Security & Energy | [phase-4.md](phase-4.md) |
| 5 | Grocery & Recipes | [phase-5.md](phase-5.md) |
| 6 | Finance | [phase-6.md](phase-6.md) |
| 7 | Climate & Notifications | [phase-7.md](phase-7.md) |
| 8 | Reporting & Polish | [phase-8.md](phase-8.md) |

## Status snapshot

Last verified: 2026-04-29.

### Module coverage

| # | Module | Status | Evidence |
|---|--------|--------|----------|
| 1 | Device Management | ✅ Shipped | `server/trpc/routers/devices/`, controls for light / thermostat / lock / sensor, `dashboard/devices/[id]` detail page (live state, history, recent commands, automations-using, room move, rename, unpair) |
| 2 | Automation Engine | ✅ Shipped | `automation/`, `scenes.ts`, `schedules.ts` routers + `AutomationBuilder` / `SceneBuilder` |
| 3 | Energy Management | ✅ Shipped | `energy/index.ts` router, `dashboard/energy` page, monthly budgets |
| 4 | Security | ✅ Shipped | Modes + events + HLS camera registry + access-log viewer |
| 5 | Climate Control | ✅ Shipped | `climate.ts` router, zone schedules, `dashboard/climate` page |
| 6 | User & Access (RBAC) | ✅ Shipped | Households, 4 roles, 30+ permissions, audit logs |
| 7 | Grocery & Pantry | ✅ Shipped | `groceries.ts` router, expiry alerts, shopping lists |
| 8 | Recipes & Meal Plans | ✅ Shipped | CRUD + quantity-aware matching (`src/lib/units.ts`) + `recipes.cook` deducts pantry stock |
| 9 | Finance | ✅ Shipped | `finance.ts` router, transactions/budgets/accounts/recurring |
| 10 | Notifications | ✅ Shipped | Router + page + alert rule schema + minute-cron evaluator + multi-channel dispatcher |
| 11 | Reporting & Analytics | ✅ Shipped | `reports.kpis`, custom reports, PDF + CSV export |
| 12 | Inventory & Maintenance | ✅ Shipped | `inventoryRouter` (`items`, `tasks`, `dueSoon`), `dashboard/inventory` page (Assets + Maintenance tabs), maintenance metrics in alert registry |
| 13 | Integration Hub | ✅ Shipped | MQTT bridge + HMAC-signed inbound webhooks (`/api/webhooks/[id]`) + voice-intent map (`/api/voice/[provider]`); dashboard at `/dashboard/integrations` |

### Technical infrastructure

| Item | Status | Notes |
|------|--------|-------|
| Next.js 14 App Router | ✅ | `src/app/(auth)/`, `src/app/(dashboard)/dashboard/` |
| tRPC + Zod | ✅ | 17 routers wired in `server/trpc/routers/_app.ts` |
| MongoDB collections | ✅ | 30+ collections in `src/lib/db/collections.ts`, indexes in `indexes.ts` |
| JWT auth (jose) | ✅ | Access + refresh tokens, `src/lib/auth/jwt.ts` |
| Socket.io WebSocket | ✅ | `server/websocket/index.ts` (auth, household rooms, MQTT relay) |
| MQTT bridge | ✅ | `server/mqtt/index.ts` (subscribe / publish / discovery) |
| Audit logging | ✅ | `src/lib/db/audit.ts` invoked on every mutation |
| BullMQ + Redis | ✅ | `server/jobs/` worker drains `nextRunAt` and processes `schedule:run` / `automation:run` jobs (`pnpm worker`) |
| Camera streaming (hls.js) | ✅ | `HlsPlayer` lazy-imports hls.js (Safari uses native HLS) |
| Reports export | ✅ | `@react-pdf/renderer` + `xlsx` |

### Known gaps (priority order)

1. **Email / push / SMS channel adapters** — dispatcher routes to them but the providers are stubs
2. **`sun_position` automation condition** — needs household lat/lon + sun calc
3. **Real Alexa/Google verification** — voice handler accepts the provider's POST shape but doesn't verify the provider's own signature yet (relies on the intent lookup as the access boundary)

## Conventions

- **Routers** live in `server/trpc/routers/<domain>.ts` (or `<domain>/index.ts` for dirs). Each is wired into `server/trpc/routers/_app.ts`.
- **Pages** live in `src/app/(dashboard)/dashboard/<domain>/page.tsx` under the App Router.
- **Collections** are accessed through `src/lib/db/collections.ts` helpers; indexes are declared in `src/lib/db/indexes.ts`.
- **Audit** mutations call `auditHelpers.logCreate / logUpdate / logDelete` in `src/lib/db/audit.ts`.
- **Permissions** are strings on the `Permission` union in `src/types/index.ts`; routers gate procedures with `withPermission(...)`.
- **Verification** before merging: `pnpm typecheck` (canonical green-light) and `pnpm lint`.
