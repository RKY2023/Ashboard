# Ashboard

A multi-tenant **ERP-based home automation** platform built on Next.js 14 (App Router), tRPC, MongoDB, MQTT, and WebSockets. It pairs IoT device control (lights, thermostats, locks, sensors, cameras) with household ERP modules (groceries, recipes, finance, reporting) under a unified RBAC model.

The full product spec lives in [`docs/ERP-Based Home Automation Software.md`](docs/ERP-Based%20Home%20Automation%20Software.md). Per-phase implementation notes are in [`docs/phases/`](docs/phases/README.md). For an architectural / build-plan walkthrough see [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md); for a hands-on user walkthrough of every dashboard module see [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md).

## Modules

| # | Module | Status | Highlights |
|---|--------|--------|------------|
| 1 | **Device Management** | Shipped | Registry, rooms, real-time control, history, pairing wizard, per-type controls (light / thermostat / lock / sensor), per-device detail page |
| 2 | **Automation Engine** | Shipped | Visual rule builder (triggers / conditions / actions), scenes, daily/weekly/once/cron schedules |
| 3 | **Energy Management** | Shipped | Readings ingest, consumption charts, monthly budgets, cost tracking |
| 4 | **Security** | Shipped | Modes (home / away / night / vacation), events, severity, ack flow, HLS camera registry, access log |
| 5 | **Climate Control** | Shipped | HVAC zones, target temperature, mode (heat / cool / auto / fan), per-zone schedules |
| 6 | **User & Access (RBAC)** | Shipped | Households, roles (`owner` / `admin` / `member` / `guest`), fine-grained permissions, audit logs |
| 7 | **Grocery & Pantry** | Shipped | Pantry / fridge / freezer tracking, expiry alerts, shopping lists, low-stock reorder thresholds |
| 8 | **Recipes & Meal Plans** | Shipped | Recipe CRUD, quantity-aware "what can I cook" matching with unit conversion, `cook` mutation that depletes pantry stock, weekly meal plans, nutrition |
| 9 | **Finance** | Shipped | Transactions (income / expense), category budgets, accounts, recurring payments, grocery-spend integration |
| 10 | **Notifications** | Shipped | In-app feed, multi-channel dispatcher (app real, email/push/sms stubs), alert rules with minute-cron evaluator + cooldown |
| 11 | **Reporting & Analytics** | Shipped | KPI dashboard, custom reports, PDF (`@react-pdf/renderer`) and CSV (`xlsx`) export |
| 12 | **Inventory & Maintenance** | Shipped | Asset registry (purchase / warranty / location), recurring tasks (monthly / quarterly / annual / custom), due-soon dashboard, alert metrics |
| 13 | **Integration Hub** | Shipped | MQTT bridge for IoT devices, HMAC-signed inbound webhooks, voice-intent map (`/api/voice/<provider>`) |
| – | **Job worker** | Shipped | BullMQ worker drains `schedules.nextRunAt` and runs automation actions (`pnpm worker`) |

### Known gaps

These items are tracked in [`memory/project_erp_migration.md`](memory/project_erp_migration.md):

- **Notification channel adapters** — in-app feed is real; email/push/SMS providers in `server/notifications/channels/stubs.ts` still log only. Transactional email (password reset) is real via Resend; the dispatcher just needs to call into the same module.
- **`sun_position`** automation condition (needs household lat/lon + sun calc)

## Tech Stack

| Category | Technologies |
|----------|--------------|
| Framework | Next.js 14.2 (App Router), React 18.3, TypeScript 5.9 |
| API | tRPC 11, Zod 4 (validation), superjson |
| Database | MongoDB 6 (multi-tenant via `householdId`) |
| Auth | JWT (jose) — access + refresh tokens, bcryptjs, RBAC |
| Real-time | Socket.io 4 (WebSocket), MQTT 5 (IoT bridge) |
| Jobs | BullMQ 5 + ioredis (workers pending) |
| State | Redux Toolkit, Redux Persist, Zustand, TanStack Query |
| UI | Tailwind CSS 3.4, Radix UI, Framer Motion, sonner, lucide-react |
| Charts | Recharts |
| Forms | React Hook Form, @hookform/resolvers |
| Maps | Leaflet, React Leaflet |
| Streaming | hls.js (camera player — UI pending) |
| Reports | @react-pdf/renderer, xlsx |
| Utilities | date-fns, nanoid, cron-parser |
| Security | bcryptjs, rate-limiter-flexible |

## Architecture

```
┌──────────────────────────────────────────────┐
│             Browser Client                    │
│   React + Socket.io Client + tRPC + Recharts  │
└──────────────────┬───────────────────────────┘
                   │ HTTPS / WebSocket
┌──────────────────▼───────────────────────────┐
│              Next.js Server                   │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  │
│  │ tRPC API │  │ Socket.io  │  │ BullMQ   │  │
│  │ routers  │  │ + MQTT     │  │ workers* │  │
│  └────┬─────┘  └──────┬─────┘  └────┬─────┘  │
│       │               │              │       │
│   ┌───▼───────────────▼──────────────▼───┐   │
│   │        MongoDB Atlas + Redis         │   │
│   └──────────────────────────────────────┘   │
└──────────────────┬───────────────────────────┘
                   │ MQTT (mosquitto)
┌──────────────────▼───────────────────────────┐
│  IoT Devices (Zigbee2MQTT / Tasmota / ESP)    │
└──────────────────────────────────────────────┘
```

\* The BullMQ worker (`pnpm worker`) runs as a separate process — it polls due schedules every 30s and processes `automation:run` and `schedule:run` jobs from the same queues that `schedules.runNow` and `automation.trigger` enqueue to.

## Project Structure

```
ashboard/
├── docs/
│   ├── ERP-Based Home Automation Software.md   # Authoritative spec
│   └── phases/                                 # Per-phase implementation notes
├── server/
│   ├── mqtt/                                   # MQTT broker bridge
│   ├── websocket/                              # Socket.io server + MQTT relay
│   ├── middleware/                             # Rate limiting
│   └── trpc/
│       ├── trpc.ts
│       ├── middleware/auth.ts                  # withPermission, ctx
│       └── routers/                            # auth, households, users,
│                                               # devices, rooms, automation,
│                                               # scenes, schedules, energy,
│                                               # security, climate, finance,
│                                               # groceries, recipes,
│                                               # notifications, reports
├── src/
│   ├── app/
│   │   ├── (auth)/                             # login, register
│   │   ├── (dashboard)/dashboard/              # all module pages
│   │   ├── api/trpc/[trpc]/route.ts            # tRPC handler
│   │   ├── layout.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── layouts/                            # DashboardLayout, Sidebar, Header
│   │   ├── devices/                            # list, card, history, pairing
│   │   ├── devices/controls/                   # light, thermostat, lock, sensor
│   │   └── automation/                         # AutomationBuilder, SceneBuilder
│   ├── lib/
│   │   ├── auth/                               # jwt, permissions, AuthProvider
│   │   ├── db/                                 # collections, indexes, audit
│   │   └── hooks/useWebSocket.ts
│   └── types/index.ts                          # All shared TS types & RBAC
└── lib/                                        # Shared utils (mongodb, validation, rate limiting, pagination)
```

## Getting Started

### Prerequisites

- Node.js 18+ (LTS)
- pnpm 10 (recommended) or npm
- MongoDB instance (Atlas or local)
- Redis (optional now, required once BullMQ workers ship)
- MQTT broker, e.g. Mosquitto (optional — only if you want real device control)

### Installation

```bash
git clone <repository-url>
cd ashboard
pnpm install
cp .env.example .env.local
```

Fill `.env.local`:

```env
# MongoDB
API_URL=mongodb+srv://user:pass@cluster.mongodb.net/ashboard?retryWrites=true&w=majority

# JWT (generate two random strings, 32+ chars each)
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Redis (caching + future BullMQ)
REDIS_URL=redis://localhost:6379

# MQTT broker (skip to disable IoT bridge)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (transactional email — password resets)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Ashboard <noreply@yourdomain.com>

# Optional: gates auth.checkEmailExists debug procedure
# DEBUG_TOKEN=some-shared-secret
```

> **Don't set `NODE_ENV` yourself.** Next.js/Vercel manage it (`development` for `next dev`, `production` for builds). Setting it manually triggers a Vercel warning.

Run the dev server:

```bash
pnpm dev
```

Open http://localhost:3000 — register an account, then create or join a household.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm worker` | Start the BullMQ job worker (drains schedules, runs automations). Requires `REDIS_URL`. |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` (canonical green-light before merge) |

## Dashboard Routes

```
/dashboard                 KPI overview (devices, energy, security, finance)
/dashboard/devices         Device registry + control
/dashboard/rooms           Room/zone management
/dashboard/automation      Automations, scenes, schedules
/dashboard/security        Modes, events, cameras
/dashboard/energy          Readings, charts, budgets
/dashboard/climate         HVAC zones and schedules
/dashboard/grocery         Pantry, shopping lists
/dashboard/recipes         Recipes, meal plans, ingredient matcher
/dashboard/finance         Transactions, budgets, accounts
/dashboard/inventory       Assets + maintenance tasks
/dashboard/integrations    Webhooks + voice intents
/dashboard/notifications   Notifications + alert rules
/dashboard/reports         KPI / custom report builder
/dashboard/users           Household members + RBAC
/dashboard/settings        Household + account settings
```

## RBAC

Roles: `owner`, `admin`, `member`, `guest`. Default permission sets live in `src/types/index.ts` (`ROLE_PERMISSIONS`). Routers gate procedures with `withPermission(...)`. Every mutation logs to `audit_logs` via `auditHelpers`.

> **Note on naming:** automation permissions are **singular** (`automation:read`), while devices/recipes/groceries/users use plural (`devices:read`). Keep the existing pattern when adding new strings — see [`memory/feedback_permission_naming.md`](memory/feedback_permission_naming.md).

## Real-time Flow

```
User clicks toggle in UI
  → tRPC mutation on /api/trpc
  → router publishes MQTT command (server/mqtt)
  → physical device acknowledges via MQTT state topic
  → MQTT bridge updates MongoDB + emits to Socket.io room (household:<id>)
  → all open clients receive deviceState event and re-render
```

The Socket.io server authenticates via the same JWT used for tRPC, scopes broadcasts to `household:<householdId>` rooms, and forwards MQTT events to subscribed clients.

## Security

- Password hashing with bcryptjs (cost 12)
- JWT access + refresh tokens (jose)
- **Password reset** — single-use SHA-256-hashed tokens with 30-min TTL, email link via Resend, generic response prevents account enumeration, successful reset invalidates all of that user's sessions
- Multi-tenant isolation: every collection query is scoped by `householdId`
- Rate limiting via `rate-limiter-flexible`
- Permission middleware on every tRPC procedure
- Audit logging on every create / update / delete
- Security headers configured in `next.config.mjs`:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `X-DNS-Prefetch-Control: on`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Run `pnpm typecheck` — must be clean before opening a PR
4. Commit your changes
5. Open a Pull Request

## License

MIT.

## Author

**Raj Kumar Yadav**
