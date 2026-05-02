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
import { groceriesRouter } from './groceries';
import { recipesRouter } from './recipes';
import { inventoryRouter } from './inventory';
import { integrationsRouter } from './integrations';

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

  // Energy & Security
  energy: energyRouter,
  security: securityRouter,

  // Finance
  finance: financeRouter,

  // Climate & Notifications
  climate: climateRouter,
  notifications: notificationsRouter,

  // Reporting
  reports: reportsRouter,

  // Grocery & Recipes (ERP-style — rewritten in place)
  groceries: groceriesRouter,
  recipes: recipesRouter,

  // Inventory & Maintenance
  inventory: inventoryRouter,

  // Integration Hub
  integrations: integrationsRouter,
});

/**
 * Export type for use in frontend client
 */
export type AppRouter = typeof appRouter;
