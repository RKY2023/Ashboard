import { ObjectId } from 'mongodb';
import { getAuditLogsCollection } from './collections';
import { AuditAction, ResourceType, AuditLog } from '@/src/types';

export interface AuditLogInput {
  userId: ObjectId;
  householdId: ObjectId;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: ObjectId;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<ObjectId> {
  const collection = await getAuditLogsCollection();

  const now = new Date();
  const auditLog: Omit<AuditLog, '_id'> = {
    userId: input.userId,
    householdId: input.householdId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    details: input.details || {},
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(auditLog as AuditLog);
  return result.insertedId;
}

/**
 * Get audit logs for a household with pagination
 */
export async function getHouseholdAuditLogs(
  householdId: ObjectId,
  options: {
    page?: number;
    pageSize?: number;
    action?: AuditAction;
    resourceType?: ResourceType;
    userId?: ObjectId;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ logs: AuditLog[]; total: number }> {
  const collection = await getAuditLogsCollection();

  const {
    page = 1,
    pageSize = 20,
    action,
    resourceType,
    userId,
    startDate,
    endDate,
  } = options;

  const query: Record<string, unknown> = { householdId };

  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (userId) query.userId = userId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) (query.createdAt as Record<string, Date>).$gte = startDate;
    if (endDate) (query.createdAt as Record<string, Date>).$lte = endDate;
  }

  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return { logs, total };
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: ResourceType,
  resourceId: ObjectId,
  limit: number = 50
): Promise<AuditLog[]> {
  const collection = await getAuditLogsCollection();

  return collection
    .find({ resourceType, resourceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get recent activity for a user
 */
export async function getUserActivity(
  userId: ObjectId,
  limit: number = 20
): Promise<AuditLog[]> {
  const collection = await getAuditLogsCollection();

  return collection
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Clean up old audit logs (for data retention policies)
 */
export async function cleanupOldAuditLogs(
  householdId: ObjectId,
  retentionDays: number = 90
): Promise<number> {
  const collection = await getAuditLogsCollection();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await collection.deleteMany({
    householdId,
    createdAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
}

/**
 * Helper to log common actions
 */
export const auditHelpers = {
  async logLogin(
    userId: ObjectId,
    householdId: ObjectId,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await createAuditLog({
      userId,
      householdId,
      action: 'login',
      resourceType: 'user',
      resourceId: userId,
      details: { timestamp: new Date().toISOString() },
      ipAddress,
      userAgent,
    });
  },

  async logLogout(userId: ObjectId, householdId: ObjectId): Promise<void> {
    await createAuditLog({
      userId,
      householdId,
      action: 'logout',
      resourceType: 'user',
      resourceId: userId,
    });
  },

  async logDeviceControl(
    userId: ObjectId,
    householdId: ObjectId,
    deviceId: ObjectId,
    action: string,
    newState: Record<string, unknown>
  ): Promise<void> {
    await createAuditLog({
      userId,
      householdId,
      action: 'control',
      resourceType: 'device',
      resourceId: deviceId,
      details: { action, newState },
    });
  },

  async logSecurityAction(
    userId: ObjectId,
    householdId: ObjectId,
    action: 'arm' | 'disarm',
    mode: string
  ): Promise<void> {
    await createAuditLog({
      userId,
      householdId,
      action,
      resourceType: 'security',
      details: { mode },
    });
  },

  async logCreate<T>(
    userId: ObjectId,
    householdId: ObjectId,
    resourceType: ResourceType,
    resourceId: ObjectId,
    data: T
  ): Promise<void> {
    await createAuditLog({
      userId,
      householdId,
      action: 'create',
      resourceType,
      resourceId,
      details: { data },
    });
  },

  async logUpdate<T>(
    userId: ObjectId,
    householdId: ObjectId,
    resourceType: ResourceType,
    resourceId: ObjectId,
    changes: T
  ): Promise<void> {
    await createAuditLog({
      userId,
      householdId,
      action: 'update',
      resourceType,
      resourceId,
      details: { changes },
    });
  },

  async logDelete(
    userId: ObjectId,
    householdId: ObjectId,
    resourceType: ResourceType,
    resourceId: ObjectId
  ): Promise<void> {
    await createAuditLog({
      userId,
      householdId,
      action: 'delete',
      resourceType,
      resourceId,
    });
  },
};
