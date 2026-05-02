import { getDatabase } from '@/lib/mongodb';
import { COLLECTIONS } from './collections';

/**
 * Ensure all required database indexes exist
 * Run this during application startup
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDatabase();

  // Users collection indexes
  await db.collection(COLLECTIONS.users).createIndexes([
    { key: { email: 1 }, unique: true },
    { key: { isActive: 1 } },
    { key: { createdAt: -1 } },
  ]);

  // Households collection indexes
  await db.collection(COLLECTIONS.households).createIndexes([
    { key: { slug: 1 }, unique: true },
    { key: { ownerId: 1 } },
    { key: { isActive: 1 } },
  ]);

  // Household members indexes
  await db.collection(COLLECTIONS.householdMembers).createIndexes([
    { key: { userId: 1, householdId: 1 }, unique: true },
    { key: { householdId: 1 } },
    { key: { userId: 1 } },
    { key: { role: 1 } },
  ]);

  // Sessions indexes (with TTL for auto-cleanup)
  await db.collection(COLLECTIONS.sessions).createIndexes([
    { key: { token: 1 }, unique: true },
    { key: { refreshToken: 1 }, unique: true },
    { key: { userId: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // TTL index
  ]);

  // Password reset tokens (TTL clears expired tokens automatically)
  await db.collection(COLLECTIONS.passwordResetTokens).createIndexes([
    { key: { tokenHash: 1 }, unique: true },
    { key: { userId: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);

  // OAuth account linking
  await db.collection(COLLECTIONS.oauthAccounts).createIndexes([
    { key: { provider: 1, providerAccountId: 1 }, unique: true },
    { key: { userId: 1 } },
  ]);

  // Audit logs indexes
  await db.collection(COLLECTIONS.auditLogs).createIndexes([
    { key: { householdId: 1, createdAt: -1 } },
    { key: { userId: 1 } },
    { key: { action: 1 } },
    { key: { resourceType: 1, resourceId: 1 } },
    { key: { createdAt: -1 } },
  ]);

  // Devices indexes
  await db.collection(COLLECTIONS.devices).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, roomId: 1 } },
    { key: { householdId: 1, type: 1 } },
    { key: { mqttTopic: 1 }, sparse: true },
    { key: { isOnline: 1 } },
  ]);

  // Rooms indexes
  await db.collection(COLLECTIONS.rooms).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, order: 1 } },
  ]);

  // Automations indexes
  await db.collection(COLLECTIONS.automations).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, isEnabled: 1 } },
  ]);

  // Scenes indexes
  await db.collection(COLLECTIONS.scenes).createIndexes([
    { key: { householdId: 1 } },
  ]);

  // Energy readings indexes (time-series optimized)
  await db.collection(COLLECTIONS.energyReadings).createIndexes([
    { key: { householdId: 1, timestamp: -1 } },
    { key: { householdId: 1, deviceId: 1, timestamp: -1 } },
    { key: { timestamp: -1 } },
  ]);

  // Energy budgets indexes
  await db.collection(COLLECTIONS.energyBudgets).createIndexes([
    { key: { householdId: 1, year: 1, month: 1 } },
  ]);

  // Security events indexes
  await db.collection(COLLECTIONS.securityEvents).createIndexes([
    { key: { householdId: 1, createdAt: -1 } },
    { key: { householdId: 1, type: 1 } },
    { key: { householdId: 1, severity: 1 } },
    { key: { isAcknowledged: 1 } },
  ]);

  // Security modes indexes
  await db.collection(COLLECTIONS.securityModes).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, isActive: 1 } },
  ]);

  // Cameras indexes
  await db.collection(COLLECTIONS.cameras).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, isActive: 1 } },
  ]);

  // Access log indexes
  await db.collection(COLLECTIONS.accessLogs).createIndexes([
    { key: { householdId: 1, at: -1 } },
    { key: { householdId: 1, action: 1 } },
    { key: { householdId: 1, deviceId: 1 } },
  ]);

  // Inventory indexes
  await db.collection(COLLECTIONS.inventory).createIndexes([
    { key: { householdId: 1, isActive: 1 } },
    { key: { householdId: 1, category: 1 } },
    { key: { householdId: 1, warrantyExpiresAt: 1 } },
  ]);

  // Maintenance task indexes
  await db.collection(COLLECTIONS.maintenanceTasks).createIndexes([
    { key: { householdId: 1, isActive: 1, nextDueAt: 1 } },
    { key: { householdId: 1, inventoryItemId: 1 } },
    { key: { householdId: 1, isComplete: 1 } },
  ]);

  // Webhook indexes
  await db.collection(COLLECTIONS.webhooks).createIndexes([
    { key: { householdId: 1, isActive: 1 } },
  ]);

  // Voice intent indexes
  await db.collection(COLLECTIONS.voiceIntents).createIndexes([
    { key: { householdId: 1, provider: 1, intent: 1 } },
    { key: { householdId: 1, isActive: 1 } },
  ]);

  // Groceries indexes
  await db.collection(COLLECTIONS.groceries).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, category: 1 } },
    { key: { householdId: 1, location: 1 } },
    { key: { householdId: 1, expiryDate: 1 } },
    { key: { householdId: 1, isLow: 1 } },
    { key: { barcode: 1 }, sparse: true },
  ]);

  // Shopping lists indexes
  await db.collection(COLLECTIONS.shoppingLists).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, isCompleted: 1 } },
  ]);

  // Recipes indexes
  await db.collection(COLLECTIONS.recipes).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, tags: 1 } },
    { key: { householdId: 1, cuisine: 1 } },
    { key: { householdId: 1, difficulty: 1 } },
    { key: { householdId: 1, isFavorite: 1 } },
    { key: { name: 'text', description: 'text', 'ingredients.name': 'text' } },
  ]);

  // Meal plans indexes
  await db.collection(COLLECTIONS.mealPlans).createIndexes([
    { key: { householdId: 1, date: 1 } },
  ]);

  // Transactions indexes
  await db.collection(COLLECTIONS.transactions).createIndexes([
    { key: { householdId: 1, date: -1 } },
    { key: { householdId: 1, type: 1 } },
    { key: { householdId: 1, categoryId: 1 } },
    { key: { householdId: 1, accountId: 1 } },
    { key: { recurringId: 1 }, sparse: true },
  ]);

  // Budgets indexes
  await db.collection(COLLECTIONS.budgets).createIndexes([
    { key: { householdId: 1, year: 1, month: 1 } },
  ]);

  // Finance categories indexes
  await db.collection(COLLECTIONS.financeCategories).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, type: 1 } },
    { key: { householdId: 1, parentId: 1 } },
  ]);

  // Accounts indexes
  await db.collection(COLLECTIONS.accounts).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, isActive: 1 } },
  ]);

  // Recurring payments indexes
  await db.collection(COLLECTIONS.recurringPayments).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, isActive: 1 } },
    { key: { nextDueDate: 1 } },
  ]);

  // Notifications indexes
  await db.collection(COLLECTIONS.notifications).createIndexes([
    { key: { userId: 1, isRead: 1 } },
    { key: { householdId: 1 } },
    { key: { createdAt: -1 } },
  ]);

  // Integrations indexes
  await db.collection(COLLECTIONS.integrations).createIndexes([
    { key: { householdId: 1 } },
    { key: { householdId: 1, type: 1 } },
  ]);

  console.log('Database indexes ensured');
}
