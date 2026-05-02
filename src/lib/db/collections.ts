import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import {
  User,
  Household,
  HouseholdMember,
  Session,
  PasswordResetToken,
  AuditLog,
  Device,
  DeviceHistory,
  Room,
  Automation,
  Scene,
  Schedule,
  EnergyReading,
  EnergyBudget,
  SecurityEvent,
  SecurityMode,
  ClimateZone,
  ClimateSchedule,
  AlertRule,
  GroceryItem,
  ShoppingList,
  Recipe,
  MealPlan,
  Transaction,
  Budget,
  FinanceCategory,
  Account,
  RecurringPayment,
  Notification,
  Integration,
  Camera,
  AccessLogEntry,
  InventoryItem,
  MaintenanceTask,
  Webhook,
  VoiceIntent,
} from '@/src/types';

// Collection names
export const COLLECTIONS = {
  // Core
  users: 'users',
  households: 'households',
  householdMembers: 'household_members',
  sessions: 'sessions',
  passwordResetTokens: 'password_reset_tokens',
  auditLogs: 'audit_logs',

  // Devices & Automation
  devices: 'devices',
  rooms: 'rooms',
  deviceHistory: 'device_history',
  automations: 'automations',
  scenes: 'scenes',
  schedules: 'schedules',

  // Security
  securityEvents: 'security_events',
  securityModes: 'security_modes',
  accessLogs: 'access_logs',
  cameras: 'cameras',

  // Energy & Climate
  energyReadings: 'energy_readings',
  energyBudgets: 'energy_budgets',
  energyRates: 'energy_rates',
  climateZones: 'climate_zones',
  climateSchedules: 'climate_schedules',

  // Grocery & Food
  groceries: 'groceries',
  shoppingLists: 'shopping_lists',
  pantryItems: 'pantry_items',
  recipes: 'recipes',
  mealPlans: 'meal_plans',
  foodCategories: 'food_categories',

  // Finance
  transactions: 'transactions',
  budgets: 'budgets',
  budgetCategories: 'budget_categories',
  financeCategories: 'finance_categories',
  accounts: 'accounts',
  recurringPayments: 'recurring_payments',
  financialGoals: 'financial_goals',

  // System
  integrations: 'integrations',
  webhooks: 'webhooks',
  voiceIntents: 'voice_intents',
  notifications: 'notifications',
  alertRules: 'alert_rules',
  inventory: 'inventory',
  maintenanceTasks: 'maintenance_tasks',
} as const;

// Type-safe collection accessors
let db: Db | null = null;

async function getDb(): Promise<Db> {
  if (!db) {
    db = await getDatabase();
  }
  return db;
}

// Core collections
export async function getUsersCollection(): Promise<Collection<User>> {
  const database = await getDb();
  return database.collection<User>(COLLECTIONS.users);
}

export async function getHouseholdsCollection(): Promise<Collection<Household>> {
  const database = await getDb();
  return database.collection<Household>(COLLECTIONS.households);
}

export async function getHouseholdMembersCollection(): Promise<Collection<HouseholdMember>> {
  const database = await getDb();
  return database.collection<HouseholdMember>(COLLECTIONS.householdMembers);
}

export async function getSessionsCollection(): Promise<Collection<Session>> {
  const database = await getDb();
  return database.collection<Session>(COLLECTIONS.sessions);
}

export async function getAuditLogsCollection(): Promise<Collection<AuditLog>> {
  const database = await getDb();
  return database.collection<AuditLog>(COLLECTIONS.auditLogs);
}

export async function getPasswordResetTokensCollection(): Promise<Collection<PasswordResetToken>> {
  const database = await getDb();
  return database.collection<PasswordResetToken>(COLLECTIONS.passwordResetTokens);
}

// Device collections
export async function getDevicesCollection(): Promise<Collection<Device>> {
  const database = await getDb();
  return database.collection<Device>(COLLECTIONS.devices);
}

export async function getRoomsCollection(): Promise<Collection<Room>> {
  const database = await getDb();
  return database.collection<Room>(COLLECTIONS.rooms);
}

export async function getAutomationsCollection(): Promise<Collection<Automation>> {
  const database = await getDb();
  return database.collection<Automation>(COLLECTIONS.automations);
}

export async function getScenesCollection(): Promise<Collection<Scene>> {
  const database = await getDb();
  return database.collection<Scene>(COLLECTIONS.scenes);
}

export async function getDeviceHistoryCollection(): Promise<Collection<DeviceHistory>> {
  const database = await getDb();
  return database.collection<DeviceHistory>(COLLECTIONS.deviceHistory);
}

export async function getSchedulesCollection(): Promise<Collection<Schedule>> {
  const database = await getDb();
  return database.collection<Schedule>(COLLECTIONS.schedules);
}

// Energy collections
export async function getEnergyReadingsCollection(): Promise<Collection<EnergyReading>> {
  const database = await getDb();
  return database.collection<EnergyReading>(COLLECTIONS.energyReadings);
}

export async function getEnergyBudgetsCollection(): Promise<Collection<EnergyBudget>> {
  const database = await getDb();
  return database.collection<EnergyBudget>(COLLECTIONS.energyBudgets);
}

// Security collections
export async function getSecurityEventsCollection(): Promise<Collection<SecurityEvent>> {
  const database = await getDb();
  return database.collection<SecurityEvent>(COLLECTIONS.securityEvents);
}

export async function getSecurityModesCollection(): Promise<Collection<SecurityMode>> {
  const database = await getDb();
  return database.collection<SecurityMode>(COLLECTIONS.securityModes);
}

// Climate collections
export async function getClimateZonesCollection(): Promise<Collection<ClimateZone>> {
  const database = await getDb();
  return database.collection<ClimateZone>(COLLECTIONS.climateZones);
}

export async function getClimateSchedulesCollection(): Promise<Collection<ClimateSchedule>> {
  const database = await getDb();
  return database.collection<ClimateSchedule>(COLLECTIONS.climateSchedules);
}

export async function getAlertRulesCollection(): Promise<Collection<AlertRule>> {
  const database = await getDb();
  return database.collection<AlertRule>(COLLECTIONS.alertRules);
}

// Grocery collections
export async function getGroceriesCollection(): Promise<Collection<GroceryItem>> {
  const database = await getDb();
  return database.collection<GroceryItem>(COLLECTIONS.groceries);
}

export async function getShoppingListsCollection(): Promise<Collection<ShoppingList>> {
  const database = await getDb();
  return database.collection<ShoppingList>(COLLECTIONS.shoppingLists);
}

export async function getRecipesCollection(): Promise<Collection<Recipe>> {
  const database = await getDb();
  return database.collection<Recipe>(COLLECTIONS.recipes);
}

export async function getMealPlansCollection(): Promise<Collection<MealPlan>> {
  const database = await getDb();
  return database.collection<MealPlan>(COLLECTIONS.mealPlans);
}

// Finance collections
export async function getTransactionsCollection(): Promise<Collection<Transaction>> {
  const database = await getDb();
  return database.collection<Transaction>(COLLECTIONS.transactions);
}

export async function getBudgetsCollection(): Promise<Collection<Budget>> {
  const database = await getDb();
  return database.collection<Budget>(COLLECTIONS.budgets);
}

export async function getFinanceCategoriesCollection(): Promise<Collection<FinanceCategory>> {
  const database = await getDb();
  return database.collection<FinanceCategory>(COLLECTIONS.financeCategories);
}

export async function getAccountsCollection(): Promise<Collection<Account>> {
  const database = await getDb();
  return database.collection<Account>(COLLECTIONS.accounts);
}

export async function getRecurringPaymentsCollection(): Promise<Collection<RecurringPayment>> {
  const database = await getDb();
  return database.collection<RecurringPayment>(COLLECTIONS.recurringPayments);
}

// System collections
export async function getNotificationsCollection(): Promise<Collection<Notification>> {
  const database = await getDb();
  return database.collection<Notification>(COLLECTIONS.notifications);
}

export async function getIntegrationsCollection(): Promise<Collection<Integration>> {
  const database = await getDb();
  return database.collection<Integration>(COLLECTIONS.integrations);
}

// Camera & access-log collections
export async function getCamerasCollection(): Promise<Collection<Camera>> {
  const database = await getDb();
  return database.collection<Camera>(COLLECTIONS.cameras);
}

export async function getAccessLogsCollection(): Promise<Collection<AccessLogEntry>> {
  const database = await getDb();
  return database.collection<AccessLogEntry>(COLLECTIONS.accessLogs);
}

// Inventory & maintenance collections
export async function getInventoryCollection(): Promise<Collection<InventoryItem>> {
  const database = await getDb();
  return database.collection<InventoryItem>(COLLECTIONS.inventory);
}

export async function getMaintenanceTasksCollection(): Promise<Collection<MaintenanceTask>> {
  const database = await getDb();
  return database.collection<MaintenanceTask>(COLLECTIONS.maintenanceTasks);
}

// Integration collections
export async function getWebhooksCollection(): Promise<Collection<Webhook>> {
  const database = await getDb();
  return database.collection<Webhook>(COLLECTIONS.webhooks);
}

export async function getVoiceIntentsCollection(): Promise<Collection<VoiceIntent>> {
  const database = await getDb();
  return database.collection<VoiceIntent>(COLLECTIONS.voiceIntents);
}

// Helper for multi-tenant queries
export function withHouseholdId<T extends { householdId?: ObjectId }>(
  query: T,
  householdId: ObjectId
): T & { householdId: ObjectId } {
  return { ...query, householdId };
}

// Pagination helper
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function getPaginationParams(options: PaginationOptions) {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
  const skip = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    skip,
    limit: pageSize,
    sort: options.sortBy
      ? { [options.sortBy]: options.sortOrder === 'desc' ? -1 : 1 }
      : { createdAt: -1 },
  };
}
