import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getInventoryCollection,
  getMaintenanceTasksCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext, MaintenanceCadence } from '@/src/types';

const cadenceEnum = z.enum(['once', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom']);

const itemCreateSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
  description: z.string().max(500).optional(),
  serialNumber: z.string().max(60).optional(),
  modelNumber: z.string().max(60).optional(),
  manufacturer: z.string().max(80).optional(),
  purchasedAt: z.string().datetime().optional(),
  purchasedPrice: z.number().nonnegative().optional(),
  warrantyExpiresAt: z.string().datetime().optional(),
  location: z.string().max(80).optional(),
  roomId: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
});

const itemUpdateSchema = itemCreateSchema.partial().extend({
  itemId: z.string(),
});

const taskUpsertSchema = z.object({
  taskId: z.string().optional(),
  inventoryItemId: z.string().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  cadence: cadenceEnum,
  intervalDays: z.number().int().min(1).max(3650).optional(),
  nextDueAt: z.string().datetime(),
  assigneeId: z.string().optional(),
});

const CADENCE_DAYS: Record<Exclude<MaintenanceCadence, 'once' | 'custom'>, number> = {
  monthly: 30,
  quarterly: 91,
  semiannual: 182,
  annual: 365,
};

function advanceDueDate(cadence: MaintenanceCadence, intervalDays: number | undefined, from: Date): Date {
  if (cadence === 'once') return from;
  const days =
    cadence === 'custom'
      ? Math.max(1, intervalDays ?? 30)
      : CADENCE_DAYS[cadence as keyof typeof CADENCE_DAYS];
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

export const inventoryRouter = router({
  /**
   * Inventory items — physical assets a household owns.
   */
  items: router({
    list: withPermission('inventory:read')
      .input(
        z.object({
          search: z.string().optional(),
          category: z.string().optional(),
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(200).default(50),
        }).optional()
      )
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const items = await getInventoryCollection();

        const query: Record<string, unknown> = {
          householdId: auth.householdId,
          isActive: true,
        };
        if (input?.search) query.name = { $regex: input.search, $options: 'i' };
        if (input?.category) query.category = input.category;

        const page = input?.page ?? 1;
        const pageSize = input?.pageSize ?? 50;
        const skip = (page - 1) * pageSize;

        const [total, results] = await Promise.all([
          items.countDocuments(query as never),
          items
            .find(query as never)
            .sort({ name: 1 })
            .skip(skip)
            .limit(pageSize)
            .toArray(),
        ]);

        return {
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          items: results.map((i) => ({
            _id: i._id.toString(),
            name: i.name,
            category: i.category,
            description: i.description,
            serialNumber: i.serialNumber,
            modelNumber: i.modelNumber,
            manufacturer: i.manufacturer,
            purchasedAt: i.purchasedAt?.toISOString(),
            purchasedPrice: i.purchasedPrice,
            warrantyExpiresAt: i.warrantyExpiresAt?.toISOString(),
            location: i.location,
            roomId: i.roomId?.toString(),
            quantity: i.quantity,
            createdAt: i.createdAt.toISOString(),
          })),
        };
      }),

    create: withPermission('inventory:write')
      .input(itemCreateSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const items = await getInventoryCollection();
        const now = new Date();

        const result = await items.insertOne({
          householdId: auth.householdId,
          name: input.name,
          category: input.category,
          description: input.description,
          serialNumber: input.serialNumber,
          modelNumber: input.modelNumber,
          manufacturer: input.manufacturer,
          purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : undefined,
          purchasedPrice: input.purchasedPrice,
          warrantyExpiresAt: input.warrantyExpiresAt ? new Date(input.warrantyExpiresAt) : undefined,
          location: input.location,
          roomId: input.roomId ? new ObjectId(input.roomId) : undefined,
          quantity: input.quantity,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        } as never);

        await auditHelpers.logCreate(
          auth.userId,
          auth.householdId!,
          'inventory',
          result.insertedId,
          { name: input.name }
        );
        return { _id: result.insertedId.toString(), msg: 'Item added' };
      }),

    update: withPermission('inventory:write')
      .input(itemUpdateSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const items = await getInventoryCollection();

        const update: Record<string, unknown> = { updatedAt: new Date() };
        if (input.name !== undefined) update.name = input.name;
        if (input.category !== undefined) update.category = input.category;
        if (input.description !== undefined) update.description = input.description;
        if (input.serialNumber !== undefined) update.serialNumber = input.serialNumber;
        if (input.modelNumber !== undefined) update.modelNumber = input.modelNumber;
        if (input.manufacturer !== undefined) update.manufacturer = input.manufacturer;
        if (input.purchasedAt !== undefined) update.purchasedAt = new Date(input.purchasedAt);
        if (input.purchasedPrice !== undefined) update.purchasedPrice = input.purchasedPrice;
        if (input.warrantyExpiresAt !== undefined) update.warrantyExpiresAt = new Date(input.warrantyExpiresAt);
        if (input.location !== undefined) update.location = input.location;
        if (input.roomId !== undefined) update.roomId = input.roomId ? new ObjectId(input.roomId) : undefined;
        if (input.quantity !== undefined) update.quantity = input.quantity;

        const result = await items.updateOne(
          {
            _id: new ObjectId(input.itemId),
            householdId: auth.householdId,
            isActive: true,
          } as never,
          { $set: update }
        );
        if (result.matchedCount === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
        }
        await auditHelpers.logUpdate(
          auth.userId,
          auth.householdId!,
          'inventory',
          new ObjectId(input.itemId),
          input
        );
        return { msg: 'Item updated' };
      }),

    delete: withPermission('inventory:delete')
      .input(z.object({ itemId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const items = await getInventoryCollection();
        const result = await items.updateOne(
          {
            _id: new ObjectId(input.itemId),
            householdId: auth.householdId,
            isActive: true,
          } as never,
          { $set: { isActive: false, updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
        }
        await auditHelpers.logDelete(
          auth.userId,
          auth.householdId!,
          'inventory',
          new ObjectId(input.itemId)
        );
        return { msg: 'Item removed' };
      }),
  }),

  /**
   * Maintenance tasks — recurring or one-shot upkeep tied (optionally) to an
   * inventory item.
   */
  tasks: router({
    list: withPermission('inventory:read')
      .input(
        z.object({
          itemId: z.string().optional(),
          includeComplete: z.boolean().default(false),
        }).optional()
      )
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const tasks = await getMaintenanceTasksCollection();

        const query: Record<string, unknown> = {
          householdId: auth.householdId,
          isActive: true,
        };
        if (input?.itemId) query.inventoryItemId = new ObjectId(input.itemId);
        if (!input?.includeComplete) query.isComplete = false;

        const results = await tasks.find(query as never).sort({ nextDueAt: 1 }).toArray();
        return results.map((t) => ({
          _id: t._id.toString(),
          inventoryItemId: t.inventoryItemId?.toString(),
          name: t.name,
          description: t.description,
          cadence: t.cadence,
          intervalDays: t.intervalDays,
          nextDueAt: t.nextDueAt.toISOString(),
          lastCompletedAt: t.lastCompletedAt?.toISOString(),
          assigneeId: t.assigneeId?.toString(),
          isComplete: t.isComplete,
          createdAt: t.createdAt.toISOString(),
        }));
      }),

    upsert: withPermission('inventory:write')
      .input(taskUpsertSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const tasks = await getMaintenanceTasksCollection();
        const now = new Date();

        const fields: Record<string, unknown> = {
          name: input.name,
          description: input.description,
          cadence: input.cadence,
          intervalDays: input.cadence === 'custom' ? input.intervalDays : undefined,
          nextDueAt: new Date(input.nextDueAt),
          assigneeId: input.assigneeId ? new ObjectId(input.assigneeId) : undefined,
          inventoryItemId: input.inventoryItemId ? new ObjectId(input.inventoryItemId) : undefined,
          updatedAt: now,
        };

        if (input.taskId) {
          const result = await tasks.updateOne(
            {
              _id: new ObjectId(input.taskId),
              householdId: auth.householdId,
              isActive: true,
            } as never,
            { $set: fields }
          );
          if (result.matchedCount === 0) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });
          }
          await auditHelpers.logUpdate(
            auth.userId,
            auth.householdId!,
            'maintenance',
            new ObjectId(input.taskId),
            input
          );
          return { _id: input.taskId, msg: 'Task updated' };
        }

        const result = await tasks.insertOne({
          householdId: auth.householdId,
          ...fields,
          isComplete: false,
          isActive: true,
          createdAt: now,
        } as never);
        await auditHelpers.logCreate(
          auth.userId,
          auth.householdId!,
          'maintenance',
          result.insertedId,
          { name: input.name }
        );
        return { _id: result.insertedId.toString(), msg: 'Task created' };
      }),

    complete: withPermission('inventory:write')
      .input(z.object({ taskId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const tasks = await getMaintenanceTasksCollection();
        const now = new Date();

        const task = await tasks.findOne({
          _id: new ObjectId(input.taskId),
          householdId: auth.householdId,
          isActive: true,
        } as never);
        if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });

        if (task.cadence === 'once') {
          await tasks.updateOne(
            { _id: task._id },
            {
              $set: {
                isComplete: true,
                lastCompletedAt: now,
                updatedAt: now,
              },
            }
          );
          return { msg: 'Task marked complete' };
        }

        const next = advanceDueDate(task.cadence, task.intervalDays, now);
        await tasks.updateOne(
          { _id: task._id },
          {
            $set: {
              lastCompletedAt: now,
              nextDueAt: next,
              updatedAt: now,
            },
          }
        );
        return { msg: 'Task completed', nextDueAt: next.toISOString() };
      }),

    delete: withPermission('inventory:delete')
      .input(z.object({ taskId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const tasks = await getMaintenanceTasksCollection();
        const result = await tasks.updateOne(
          {
            _id: new ObjectId(input.taskId),
            householdId: auth.householdId,
            isActive: true,
          } as never,
          { $set: { isActive: false, updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });
        }
        await auditHelpers.logDelete(
          auth.userId,
          auth.householdId!,
          'maintenance',
          new ObjectId(input.taskId)
        );
        return { msg: 'Task removed' };
      }),
  }),

  /**
   * Tasks coming due in the next N days (default 14). Used by the dashboard
   * widget and by the alert evaluator's `maintenance.dueSoon` metric.
   */
  dueSoon: withPermission('inventory:read')
    .input(z.object({ days: z.number().min(1).max(180).default(14) }).optional())
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const tasks = await getMaintenanceTasksCollection();

      const days = input?.days ?? 14;
      const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const results = await tasks
        .find({
          householdId: auth.householdId,
          isActive: true,
          isComplete: false,
          nextDueAt: { $lte: cutoff },
        } as never)
        .sort({ nextDueAt: 1 })
        .toArray();

      return results.map((t) => ({
        _id: t._id.toString(),
        name: t.name,
        cadence: t.cadence,
        nextDueAt: t.nextDueAt.toISOString(),
        inventoryItemId: t.inventoryItemId?.toString(),
      }));
    }),
});
