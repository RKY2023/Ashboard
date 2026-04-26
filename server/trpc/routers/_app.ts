import { router } from '@/server/trpc';
import { authRouter } from './auth';
import { healthRouter } from './health';
import { householdsRouter } from './households';
import { usersRouter } from './users';
import { devicesRouter } from './devices';
import { roomsRouter } from './rooms';
import { automationRouter } from './automation';
import { scenesRouter } from './scenes';
import { schedulesRouter } from './schedules';
import { energyRouter } from './energy';
import { securityRouter } from './security';
import { financeRouter } from './finance';
import { climateRouter } from './climate';
import { notificationsRouter } from './notifications';
import { reportsRouter } from './reports';
import { meetupsRouter } from './meetups';
import { groceriesRouter } from './groceries';
import { recipesRouter } from './recipes';
import { ipaddressesRouter } from './ipaddresses';

/**
 * Root router that merges all sub-routers
 *
 * Structure:
 * - auth: Authentication (login, register, refresh, logout)
 * - health: Health check endpoints
 * - households: Household management (CRUD, settings)
 * - users: User management within households (RBAC)
 * - devices: Device management (CRUD, control, state)
 * - rooms: Room management
 * - meetups: Legacy meetups data
 * - groceries: Legacy groceries data
 * - recipes: Legacy recipes data
 * - ipaddresses: Legacy IP address data
 */
export const appRouter = router({
  // Core
  auth: authRouter,
  health: healthRouter,
  households: householdsRouter,
  users: usersRouter,

  // Device Management
  devices: devicesRouter,
  rooms: roomsRouter,

  // Automation
  automation: automationRouter,
  scenes: scenesRouter,
  schedules: schedulesRouter,

  // Phase 4 - Energy & Security
  energy: energyRouter,
  security: securityRouter,

  // Phase 6 - Finance
  finance: financeRouter,

  // Phase 7 - Climate & Notifications
  climate: climateRouter,
  notifications: notificationsRouter,

  // Phase 8 - Reporting
  reports: reportsRouter,

  // Legacy (to be migrated)
  meetups: meetupsRouter,
  groceries: groceriesRouter,
  recipes: recipesRouter,
  ipaddresses: ipaddressesRouter,
});

/**
 * Export type for use in frontend client
 */
export type AppRouter = typeof appRouter;
