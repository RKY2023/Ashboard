# Phase 1 — Foundation

Multi-tenant authentication, RBAC, household management, and the App Router shell that every later phase builds on.

## What shipped

### Auth & sessions
- `src/lib/auth/jwt.ts` — JWT access/refresh token sign/verify using `jose`.
- `src/lib/auth/index.ts` — exports auth utilities.
- `src/lib/auth/AuthProvider.tsx` — React context that loads the current user and exposes login/logout/refresh.
- `src/lib/auth/permissions.ts` — `hasPermission`, `mergePermissions`, `PERMISSION_GROUPS`, label maps for UI.
- `server/trpc/middleware/auth.ts` — `protectedProcedure`, `householdProcedure`, `adminProcedure`, `ownerProcedure`, and `withPermission(perm)` factory.
- `server/trpc/routers/auth.ts` — login, register, refresh, logout, **`requestPasswordReset`**, **`resetPassword`**, and the secret-gated **`checkEmailExists`** debug procedure.
- `pages/api/panel.ts` — tRPC panel for browsing the API in dev.

### OAuth (Google + GitHub)
- `src/lib/auth/oauth.ts` — `arctic` client factories (env-gated) + `findOrCreateUserFromOAuth(profile)` which handles the lookup chain: `oauth_accounts` by `(provider, providerAccountId)` → users by email (only when the provider reports `email_verified=true`) → fresh user with no `passwordHash` and no household.
- `src/app/api/auth/oauth/[provider]/start/route.ts` — generates state + (Google) PKCE verifier, stashes both as HttpOnly+Secure+SameSite=Lax cookies (10-min TTL), redirects to provider.
- `src/app/api/auth/oauth/[provider]/callback/route.ts` — verifies state cookie, exchanges code, fetches userinfo, calls the find-or-create helper, mints the same JWT pair `auth.login` does, writes `sessions` + audit log, then redirects to `/auth/oauth/finish#token=...&refreshToken=...`. Tokens travel in the URL hash so they don't appear in server logs or Referer headers.
- `src/app/auth/oauth/finish/page.tsx` — client-only; reads tokens from the hash, persists to `localStorage`, hard-navigates to `/dashboard` so `AuthProvider` re-runs its mount effect.
- `oauth_accounts` collection — compound unique `(provider, providerAccountId)` is the primary lookup; secondary `userId` index for "list a user's connected providers".
- `User.passwordHash` is now optional. `auth.login` short-circuits for users without one ("Invalid email or password") so OAuth-only accounts can't be enumerated by trying password login.
- GitHub flow falls back to `/user/emails` when `/user.email` is null and refuses if no verified primary email exists. Google's `email_verified` is trusted directly.
- Buttons on `/login` and `/register` are gated on `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED` / `NEXT_PUBLIC_OAUTH_GITHUB_ENABLED`. Server-side, the start route also 404s if the secrets aren't set, so a stale flag doesn't expose a broken flow.

### Password reset
- `src/app/(auth)/forgot-password/page.tsx` — request form → "check your email" success state.
- `src/app/(auth)/reset-password/page.tsx` — reads `?token=` from URL, password + confirm form, redirects to `/login` on success.
- `src/lib/email/index.ts` — Resend client + `sendPasswordResetEmail` (HTML + text bodies).
- `password_reset_tokens` collection — stores SHA-256 hash of the raw token (so a DB leak doesn't yield a usable link), 30-min TTL via index, single-use (`usedAt`).
- `requestPasswordReset` always returns the same generic response so callers cannot enumerate accounts; email-send failures are logged server-side, never surfaced. In non-production, the reset URL is logged to the server console as a fallback when Resend isn't configured.
- `resetPassword` invalidates **all** sessions for the user after a successful reset, so any pre-reset stolen session is killed.
- `auth.checkEmailExists` is a debug-only procedure gated by an `x-debug-token` header that must match `DEBUG_TOKEN`; without the env var or a matching header it 404s.

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
- `lib/rateLimit.ts` and `server/middleware/rateLimit.ts` use `rate-limiter-flexible` against Redis (or in-memory fallback) for login and tRPC mutations. Password reset request and submit reuse `loginProcedure` (5 req / 15 min per IP).

### Transactional email
- Resend is the provider for password-reset emails. Configure with `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (must use a domain verified in the Resend dashboard).
- Notification channel adapters (`server/notifications/channels/stubs.ts`) for email/push/SMS are still stubs — only the auth flow uses Resend today. Wiring the dispatcher into the same module is a follow-up.

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
src/lib/auth/{jwt,permissions,AuthProvider,oauth}.ts
src/lib/db/{collections,indexes,audit}.ts
src/lib/email/index.ts
server/trpc/middleware/auth.ts
server/trpc/routers/{auth,households,users}.ts
src/app/api/auth/oauth/[provider]/{start,callback}/route.ts
src/app/auth/oauth/finish/page.tsx
src/app/(auth)/{login,register,forgot-password,reset-password}/page.tsx
src/components/auth/OAuthButtons.tsx
src/app/(dashboard)/layout.tsx
src/components/layouts/{Sidebar,Header,DashboardLayout}.tsx
```
