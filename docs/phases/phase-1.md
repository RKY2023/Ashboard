# Phase 1 — Foundation

Multi-tenant authentication, RBAC, household management, and the App Router shell that every later phase builds on.

## What shipped

### Auth & sessions
- `src/lib/auth/jwt.ts` — JWT access/refresh token sign/verify using `jose`.
- `src/lib/auth/index.ts` — exports auth utilities.
- `src/lib/auth/AuthProvider.tsx` — React context that loads the current user and exposes login/logout/refresh.
- `src/lib/auth/permissions.ts` — `hasPermission`, `mergePermissions`, `PERMISSION_GROUPS`, label maps for UI.
- `server/trpc/middleware/auth.ts` — `protectedProcedure`, `householdProcedure`, `adminProcedure`, `ownerProcedure`, and `withPermission(perm)` factory.
- `server/trpc/routers/auth.ts` — login, register, refresh, logout.
- `pages/api/panel.ts` — tRPC panel for browsing the API in dev.

### Multi-tenancy
- `src/types/index.ts` types: `Household`, `HouseholdMember`, `User`, `Session`, `UserRole`, `Permission` union, `ROLE_PERMISSIONS` defaults for `owner | admin | member | guest`.
- `server/trpc/routers/households.ts` — CRUD and settings for households.
- `server/trpc/routers/users.ts` — list members, invite, update, remove (RBAC-aware).
- All collections stamped with `householdId` for tenant isolation.

### Database layer
- `src/lib/db/collections.ts` — every collection name in `COLLECTIONS` and a typed `getXCollection()` helper for each. `getDatabase()` is memoised.
- `src/lib/db/indexes.ts` — `ensureIndexes()` applies unique/compound/TTL indexes for users, sessions, audit logs, devices, and the rest.
- `src/lib/db/audit.ts` — `createAuditLog`, `getHouseholdAuditLogs`, `getResourceAuditLogs`, `getUserActivity`, `cleanupOldAuditLogs`, plus `auditHelpers.logCreate/logUpdate/logDelete/logLogin/logLogout/logSecurityAction/logDeviceControl`.
- Sessions use a TTL index on `expiresAt` for automatic cleanup.

### App Router shell
- `src/app/layout.tsx` — root layout with `Providers` wrapping `ThemeProvider`, `AuthProvider`, tRPC client, and `Toaster`.
- `src/app/providers.tsx` — exports the `trpc` client (`createTRPCReact<AppRouter>`) and configures `httpBatchLink` with bearer-token headers from `localStorage`.
- `src/app/(auth)/layout.tsx`, `login/page.tsx`, `register/page.tsx` — unauthenticated entry points.
- `src/app/(dashboard)/layout.tsx` — auth-gated shell with `Sidebar` + `Header` + `MobileMenuButton`.
- `src/components/layouts/Sidebar.tsx` — navigation registry; new pages auto-appear when their route exists.
- `src/components/layouts/Header.tsx` — top bar with theme toggle and user menu.
- `src/lib/store/index.ts` — Zustand stores (UI prefs, optimistic device state).

### Rate limiting
- `lib/rateLimit.ts` and `server/middleware/rateLimit.ts` use `rate-limiter-flexible` against Redis (or in-memory fallback) for login and tRPC mutations.

## Permission model

Default role permissions (see `ROLE_PERMISSIONS` in `src/types/index.ts`):

| Role | Highlights |
|------|-----------|
| `owner` | Everything, including user management and report export. |
| `admin` | All read/write except `users:manage`, `*:delete` for sensitive resources. |
| `member` | Read + control devices, write groceries/recipes/finance, view reports. |
| `guest` | Read-only on devices, security, grocery, recipes. |

Routers gate every procedure with `withPermission('<resource>:<action>')`.

## Why these choices

- **JWT in `localStorage` with refresh** keeps the API stateless and lets a future React Native client share the same auth.
- **`householdId` on every document** means tenant isolation is a query filter, not a separate database — easy to migrate, easy to audit.
- **Permission strings (not numeric flags)** are self-documenting in routers; new domains add new strings rather than reshuffling bits.

## Critical files

```
src/lib/auth/{jwt,permissions,AuthProvider}.ts
src/lib/db/{collections,indexes,audit}.ts
server/trpc/middleware/auth.ts
server/trpc/routers/{auth,households,users}.ts
src/app/(auth)/*
src/app/(dashboard)/layout.tsx
src/components/layouts/{Sidebar,Header,DashboardLayout}.tsx
```
