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

## Conventions

- **Routers** live in `server/trpc/routers/<domain>.ts` (or `<domain>/index.ts` for dirs). Each is wired into `server/trpc/routers/_app.ts`.
- **Pages** live in `src/app/(dashboard)/dashboard/<domain>/page.tsx` under the App Router.
- **Collections** are accessed through `src/lib/db/collections.ts` helpers; indexes are declared in `src/lib/db/indexes.ts`.
- **Audit** mutations call `auditHelpers.logCreate / logUpdate / logDelete` in `src/lib/db/audit.ts`.
- **Permissions** are strings on the `Permission` union in `src/types/index.ts`; routers gate procedures with `withPermission(...)`.
