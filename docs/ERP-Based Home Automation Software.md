# ERP-Based Home Automation Software - Implementation Plan

  ## Project Overview

  Transform the existing Ashboard Next.js dashboard into a comprehensive **ERP-based Home Automation Software**
  with multi-tenant SaaS architecture.

  ### Technical Stack
  - **Framework**: Next.js 14 (App Router migration), React 18, TypeScript
  - **Database**: MongoDB Atlas (multi-tenant)
  - **API**: tRPC with Zod validation
  - **Real-time**: Socket.io (WebSocket) + MQTT (IoT devices)
  - **Deployment**: Hybrid (Cloud dashboard + Local MQTT broker)
  - **UI**: Tailwind CSS + shadcn/ui + Recharts

  ---

  ## Module Architecture

  ### 1. Home Automation Modules
  | Module | Features |
  |--------|----------|
  | **Device Management** | Device registry, rooms/zones, real-time control, status monitoring |
  | **Security & Cameras** | Camera feeds (HLS/WebRTC), motion detection, alarms, access logs |
  | **Energy Management** | Real-time consumption, cost tracking, budgets, carbon footprint |
  | **Climate Control** | HVAC zones, temperature scheduling, humidity monitoring |
  | **Automation Engine** | Visual rule builder, scenes, schedules, triggers/conditions/actions |

  ### 2. ERP Modules - Food & Grocery
  | Module | Features |
  |--------|----------|
  | **Grocery Management** | Shopping lists, inventory tracking, expiry dates, reorder alerts |
  | **Food Inventory** | Pantry items, fridge/freezer tracking, consumption patterns |
  | **Recipe Management** | Recipe database, ingredient matching, meal planning, nutrition |

  ### 3. ERP Modules - Finance
  | Module | Features |
  |--------|----------|
  | **Budget Management** | Monthly budgets, category limits, alerts |
  | **Expense Tracking** | Transaction logging, categorization, receipt storage |
  | **Finance-Grocery Integration** | Grocery spending analytics, food budget tracking |
  | **Income Management** | Income sources, recurring payments |
  | **Financial Reports** | Spending trends, budget vs actual, forecasts |

  ### 4. ERP Core Modules
  | Module | Features |
  |--------|----------|
  | **User & Access (RBAC)** | Multi-household, roles, permissions, audit logs |
  | **Inventory & Maintenance** | Device inventory, warranties, maintenance schedules |
  | **Notifications** | Push, email, SMS with configurable rules |
  | **Reporting & Analytics** | Custom reports, KPIs, PDF/CSV export |

  ---

  ## Database Schema (MongoDB Collections)

  ### Core Collections
  ```
  households          - Multi-tenant household data
  users               - User accounts with RBAC
  sessions            - JWT sessions
  audit_logs          - Activity tracking
  ```

  ### Device & Automation
  ```
  devices             - Device registry with state
  rooms               - Room/zone organization
  zones               - Climate/security zones
  device_history      - State change history
  automations         - Automation rules
  scenes              - Quick scenes
  schedules           - Time-based schedules
  ```

  ### Security
  ```
  security_events     - Motion, door, alarm events
  security_modes      - Arm/disarm configurations
  access_logs         - Lock access history
  cameras             - Camera configurations
  ```

  ### Energy & Climate
  ```
  energy_readings     - Consumption data (time-series)
  energy_budgets      - Energy budget limits
  energy_rates        - Utility rate plans
  climate_zones       - HVAC zone configs
  climate_schedules   - Temperature schedules
  ```

  ### Food & Grocery (NEW)
  ```
  groceries           - Grocery inventory items
  shopping_lists      - Shopping list items
  pantry_items        - Food storage inventory
  recipes             - Recipe database
  meal_plans          - Weekly meal planning
  food_categories     - Food categorization
  ```

  ### Finance (NEW)
  ```
  transactions        - Income/expense records
  budgets             - Budget definitions
  budget_categories   - Spending categories
  accounts            - Bank/wallet accounts
  recurring_payments  - Subscriptions, bills
  financial_goals     - Savings goals
  ```

  ### System
  ```
  integrations        - Third-party connections
  webhooks            - Webhook configurations
  notifications       - Notification queue
  alert_rules         - Alert configurations
  inventory           - Device/asset inventory
  maintenance_tasks   - Maintenance schedules
  ```

  ---

  ## tRPC Router Structure

  ```
  server/trpc/routers/
  ├── _app.ts                 # Root router
  ├── auth.ts                 # Authentication
  ├── households.ts           # Multi-tenant management
  ├── users.ts                # User CRUD, permissions
  │
  ├── devices/
  │   ├── index.ts            # Device CRUD, control
  │   ├── discovery.ts        # Device pairing
  │   └── history.ts          # State history
  │
  ├── rooms.ts                # Room/zone management
  ├── automation.ts           # Rules, scenes, schedules
  │
  ├── energy/
  │   ├── index.ts            # Readings, analytics
  │   └── budgets.ts          # Budget management
  │
  ├── security/
  │   ├── index.ts            # Modes, events
  │   ├── cameras.ts          # Camera management
  │   └── access.ts           # Access logs
  │
  ├── climate.ts              # Zone control, schedules
  │
  ├── grocery/                # NEW
  │   ├── index.ts            # Inventory CRUD
  │   ├── shopping.ts         # Shopping lists
  │   └── pantry.ts           # Pantry tracking
  │
  ├── recipes/                # NEW
  │   ├── index.ts            # Recipe CRUD
  │   ├── matching.ts         # Ingredient matching
  │   └── mealplans.ts        # Meal planning
  │
  ├── finance/                # NEW
  │   ├── index.ts            # Dashboard, summary
  │   ├── transactions.ts     # Transaction CRUD
  │   ├── budgets.ts          # Budget management
  │   ├── categories.ts       # Category management
  │   └── reports.ts          # Financial reports
  │
  ├── notifications.ts        # Notification management
  ├── integrations.ts         # Third-party connections
  └── reports.ts              # Custom reporting
  ```

  ---

  ## UI Component Structure

  ```
  src/components/
  ├── layouts/
  │   ├── DashboardLayout.tsx
  │   ├── Sidebar.tsx
  │   └── Header.tsx
  │
  ├── dashboard/
  │   ├── DashboardGrid.tsx
  │   └── widgets/
  │       ├── DeviceStatusWidget.tsx
  │       ├── EnergyWidget.tsx
  │       ├── SecurityWidget.tsx
  │       ├── GroceryWidget.tsx      # NEW
  │       ├── BudgetWidget.tsx       # NEW
  │       └── MealPlanWidget.tsx     # NEW
  │
  ├── devices/
  │   ├── DeviceList.tsx
  │   ├── DeviceCard.tsx
  │   ├── DeviceControl.tsx
  │   └── controls/
  │       ├── LightControl.tsx
  │       ├── ThermostatControl.tsx
  │       └── LockControl.tsx
  │
  ├── automation/
  │   ├── AutomationList.tsx
  │   ├── AutomationEditor/
  │   │   ├── TriggerStep.tsx
  │   │   ├── ConditionStep.tsx
  │   │   └── ActionStep.tsx
  │   └── SceneCard.tsx
  │
  ├── security/
  │   ├── SecurityDashboard.tsx
  │   ├── CameraGrid.tsx
  │   └── EventTimeline.tsx
  │
  ├── energy/
  │   ├── ConsumptionChart.tsx
  │   ├── CostBreakdown.tsx
  │   └── BudgetManager.tsx
  │
  ├── grocery/                    # NEW
  │   ├── GroceryList.tsx
  │   ├── ShoppingList.tsx
  │   ├── PantryView.tsx
  │   ├── ExpiryTracker.tsx
  │   └── GroceryItem.tsx
  │
  ├── recipes/                    # NEW
  │   ├── RecipeList.tsx
  │   ├── RecipeCard.tsx
  │   ├── RecipeDetail.tsx
  │   ├── IngredientMatcher.tsx
  │   ├── MealPlanner.tsx
  │   └── NutritionInfo.tsx
  │
  ├── finance/                    # NEW
  │   ├── FinanceDashboard.tsx
  │   ├── TransactionList.tsx
  │   ├── TransactionForm.tsx
  │   ├── BudgetOverview.tsx
  │   ├── CategoryBreakdown.tsx
  │   ├── SpendingChart.tsx
  │   └── GrocerySpending.tsx
  │
  └── reports/
  ├── ReportBuilder.tsx
  └── KPICards.tsx
  ```

  ---

  ## Page Routes (App Router)

  ```
  src/app/
  ├── (auth)/
  │   ├── login/page.tsx
  │   └── register/page.tsx
  │
  ├── (dashboard)/
  │   ├── layout.tsx              # Dashboard shell
  │   ├── page.tsx                # Main dashboard
  │   │
  │   ├── devices/
  │   │   ├── page.tsx
  │   │   └── [id]/page.tsx
  │   │
  │   ├── rooms/page.tsx
  │   ├── automation/page.tsx
  │   ├── security/page.tsx
  │   ├── energy/page.tsx
  │   ├── climate/page.tsx
  │   │
  │   ├── grocery/               # NEW
  │   │   ├── page.tsx           # Grocery inventory
  │   │   ├── shopping/page.tsx  # Shopping lists
  │   │   └── pantry/page.tsx    # Pantry view
  │   │
  │   ├── recipes/               # NEW
  │   │   ├── page.tsx           # Recipe browser
  │   │   ├── [id]/page.tsx      # Recipe detail
  │   │   ├── meal-plan/page.tsx # Weekly planner
  │   │   └── whats-cooking/page.tsx # Based on pantry
  │   │
  │   ├── finance/               # NEW
  │   │   ├── page.tsx           # Finance dashboard
  │   │   ├── transactions/page.tsx
  │   │   ├── budgets/page.tsx
  │   │   ├── reports/page.tsx
  │   │   └── grocery-spending/page.tsx
  │   │
  │   ├── users/page.tsx
  │   ├── settings/page.tsx
  │   └── reports/page.tsx
  │
  └── api/
  ├── trpc/[trpc]/route.ts
  ├── mqtt/route.ts
  └── webhooks/route.ts
  ```

  ---

  ## Real-Time Architecture

  ```
  ┌─────────────────────────────────────────┐
  │            Browser Client               │
  │  React + Socket.io Client + tRPC        │
  └──────────────┬──────────────────────────┘
  │ WebSocket
  ┌──────────────▼──────────────────────────┐
  │           Next.js Server                │
  │  ┌─────────────┐  ┌─────────────────┐   │
  │  │ tRPC API    │  │ Socket.io Server│   │
  │  └──────┬──────┘  └────────┬────────┘   │
  │         │                  │            │
  │  ┌──────▼──────────────────▼────────┐   │
  │  │       Redis Pub/Sub + BullMQ     │   │
  │  └──────────────┬───────────────────┘   │
  │                 │                       │
  │  ┌──────────────▼───────────────────┐   │
  │  │         MQTT Client              │   │
  │  └──────────────┬───────────────────┘   │
  └─────────────────┼───────────────────────┘
  │ MQTT
  ┌─────────────────▼───────────────────────┐
  │    Local MQTT Broker (Mosquitto)        │
  │         (User's Home Network)           │
  └─────────────────┬───────────────────────┘
  │
  ┌─────────────────▼───────────────────────┐
  │            IoT Devices                  │
  │  Zigbee2MQTT, Tasmota, ESPHome, etc.    │
  └─────────────────────────────────────────┘
  ```

  ---

  ## Dependencies to Add

  ```json
  {
  "dependencies": {
  // Real-time
  "socket.io": "^4.7.0",
  "socket.io-client": "^4.7.0",
  "mqtt": "^5.3.0",
  "ioredis": "^5.3.0",
  "bullmq": "^5.1.0",

  // Auth
  "jose": "^5.2.0",

  // State
  "zustand": "^4.5.0",

  // Charts
  "recharts": "^2.12.0",
  "date-fns": "^3.3.0",

  // UI Extensions
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-tabs": "^1.0.4",
  "@radix-ui/react-select": "^2.0.0",
  "@radix-ui/react-slider": "^1.1.2",
  "cmdk": "^0.2.0",
  "sonner": "^1.4.0",
  "@dnd-kit/core": "^6.1.0",

  // Camera streaming
  "hls.js": "^1.5.0",

  // Export
  "@react-pdf/renderer": "^3.4.0",
  "xlsx": "^0.18.5",

  // Utilities
  "nanoid": "^5.0.0",
  "cron-parser": "^4.9.0"
  }
  }
  ```

  ---

  ## Implementation Phases

  ### Phase 1: Foundation (2-3 weeks)
  **Goal**: Core infrastructure and multi-tenant auth

  - [ ] Migrate to Next.js App Router structure
  - [ ] Implement JWT auth with refresh tokens
  - [ ] Create household/multi-tenant schema
  - [ ] Build RBAC permission system
  - [ ] Set up Redis for caching/pub-sub
  - [ ] Create base dashboard layout with sidebar
  - [ ] Implement audit logging

  **Critical Files**:
  - `src/server/trpc/middleware/auth.ts`
  - `src/lib/auth/jwt.ts`
  - `src/components/layouts/DashboardLayout.tsx`

  ### Phase 2: Device Management (2-3 weeks)
  **Goal**: Full device lifecycle with MQTT

  - [ ] Create device/room collections and schemas
  - [ ] Build device CRUD tRPC routers
  - [ ] Implement MQTT client connection
  - [ ] Create WebSocket server for real-time updates
  - [ ] Build device listing and control UI
  - [ ] Device pairing wizard
  - [ ] Device history and charts

  **Critical Files**:
  - `src/server/mqtt/index.ts`
  - `src/server/websocket/index.ts`
  - `src/components/devices/DeviceControl.tsx`

  ### Phase 3: Automation Engine (2 weeks)
  **Goal**: Rules, scenes, and schedules

  - [ ] Automation schema with triggers/conditions/actions
  - [ ] Scene management
  - [ ] Schedule system with cron
  - [ ] Visual automation builder UI
  - [ ] BullMQ workers for execution

  **Critical Files**:
  - `src/server/jobs/workers/automation.ts`
  - `src/components/automation/AutomationEditor/`

  ### Phase 4: Security & Energy (2 weeks)
  **Goal**: Security system and energy monitoring

  - [ ] Security modes and events
  - [ ] Camera streaming integration (HLS)
  - [ ] Access logs for smart locks
  - [ ] Energy reading ingestion
  - [ ] Consumption charts and analytics
  - [ ] Budget alerts

  **Critical Files**:
  - `src/components/security/CameraPlayer.tsx`
  - `src/components/energy/ConsumptionChart.tsx`

  ### Phase 5: Grocery & Food Management (2 weeks)
  **Goal**: Grocery inventory and recipe system

  - [ ] Grocery inventory with categories
  - [ ] Shopping list management
  - [ ] Pantry/fridge/freezer tracking
  - [ ] Expiry date alerts
  - [ ] Recipe database with search
  - [ ] Ingredient matching ("What can I cook?")
  - [ ] Meal planning calendar

  **Critical Files**:
  - `src/server/trpc/routers/grocery/`
  - `src/server/trpc/routers/recipes/`
  - `src/components/recipes/IngredientMatcher.tsx`

  ### Phase 6: Finance Management (2 weeks)
  **Goal**: Complete financial tracking

  - [ ] Transaction logging (income/expense)
  - [ ] Budget management with categories
  - [ ] Recurring payments tracking
  - [ ] Grocery spending integration
  - [ ] Spending analytics and charts
  - [ ] Financial reports (PDF export)

  **Critical Files**:
  - `src/server/trpc/routers/finance/`
  - `src/components/finance/FinanceDashboard.tsx`
  - `src/components/finance/GrocerySpending.tsx`

  ### Phase 7: Climate & Notifications (1-2 weeks)
  **Goal**: Climate control and alert system

  - [ ] Climate zone management
  - [ ] Temperature scheduling
  - [ ] Push notification system
  - [ ] Alert rule configuration
  - [ ] Email/notification templates

  ### Phase 8: Reporting & Polish (1-2 weeks)
  **Goal**: Analytics and final polish

  - [ ] Dashboard KPI widgets
  - [ ] Custom report builder
  - [ ] PDF/CSV export
  - [ ] Performance optimization
  - [ ] Mobile responsiveness
  - [ ] Documentation

  ---

  ## Verification Plan

  ### After Each Phase:
  1. Run dev server: `pnpm dev`
  2. Test all new tRPC endpoints via tRPC Panel
  3. Verify real-time updates work
  4. Check mobile responsiveness
  5. Run TypeScript type checking: `pnpm tsc --noEmit`

  ### Integration Tests:
  - Device control flow (UI → tRPC → MQTT → Device → WebSocket → UI)
  - Automation trigger execution
  - Multi-tenant data isolation
  - Permission enforcement
  - Recipe ingredient matching accuracy
  - Budget alert triggers

  ### End-to-End Scenarios:
  1. Create household → Add user → Set permissions → Verify access
  2. Add device → Control device → View history
  3. Create automation → Trigger → Verify execution
  4. Add grocery → Create recipe → Generate shopping list
  5. Log expense → Check budget → View reports

  ---

  ## Key Integration Points

  ### Existing Code to Extend:
  - `lib/mongodb.ts` - Add new collection helpers
  - `lib/validation.ts` - Add new Zod schemas
  - `server/trpc/routers/_app.ts` - Merge new routers
  - `pages/_app.tsx` - Add WebSocket provider

  ### Finance-Grocery Integration:
  - When adding grocery item, optionally link to transaction
  - Grocery spending report pulls from both collections
  - Budget category "Food/Groceries" auto-tracks grocery purchases

  ### Recipe-Pantry Integration:
  - "What can I cook?" queries pantry inventory
  - Recipe selection auto-generates shopping list for missing items
  - Cooking a recipe depletes pantry quantities

  ---

  ## Notes

  - MQTT broker runs locally on user's network for IoT device connectivity
  - Cloud dashboard connects to local broker via secure tunnel or direct IP
  - All device state synced to cloud for remote access
  - Financial data encrypted at rest
  - Multi-tenant isolation via householdId on all queries


  If you need specific details from before exiting plan mode (like exact code snippets, error messages, or content
  you generated), read the full transcript at:
  C:\Users\Santo\.claude\projects\E--Work-ashboard\950ff3a0-b7cc-41b2-94d4-568c2da94c0d.jsonl
  ~/.claude/projects/E--Work-ashboard/memory/project_erp_migration.md