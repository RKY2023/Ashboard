import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getGroceriesCollection,
  getShoppingListsCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';

const locationEnum = z.enum(['pantry', 'fridge', 'freezer', 'other']);

const createItemSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  quantity: z.number().min(0),
  unit: z.string().min(1).max(20),
  location: locationEnum,
  expiryDate: z.string().datetime().optional(),
  purchaseDate: z.string().datetime().optional(),
  price: z.number().min(0).optional(),
  barcode: z.string().optional(),
  notes: z.string().max(500).optional(),
  reorderThreshold: z.number().min(0).optional(),
});

const updateItemSchema = createItemSchema.partial().extend({
  itemId: z.string(),
});

const listItemsSchema = z.object({
  location: locationEnum.optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  isLow: z.boolean().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(50),
});

const shoppingListItemSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: z.number().min(0),
  unit: z.string().min(1).max(20),
  category: z.string().max(60),
  groceryItemId: z.string().optional(),
  recipeId: z.string().optional(),
});

const createShoppingListSchema = z.object({
  name: z.string().min(1).max(80),
  items: z.array(shoppingListItemSchema).default([]),
});

const togglePurchasedSchema = z.object({
  listId: z.string(),
  itemIndex: z.number().min(0),
});

const addItemsToListSchema = z.object({
  listId: z.string(),
  items: z.array(shoppingListItemSchema),
});

export const groceriesRouter = router({
  /**
   * List grocery items with optional filters
   */
  list: withPermission('grocery:read')
    .input(listItemsSchema)
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const groceries = await getGroceriesCollection();

      const query: Record<string, unknown> = { householdId: auth.householdId };
      if (input.location) query.location = input.location;
      if (input.category) query.category = input.category;
      if (input.isLow !== undefined) query.isLow = input.isLow;
      if (input.search) {
        query.name = { $regex: input.search, $options: 'i' };
      }

      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        groceries.countDocuments(query),
        groceries
          .find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(input.pageSize)
          .toArray(),
      ]);

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
        items: items.map((i) => ({
          _id: i._id.toString(),
          name: i.name,
          category: i.category,
          quantity: i.quantity,
          unit: i.unit,
          location: i.location,
          expiryDate: i.expiryDate?.toISOString(),
          purchaseDate: i.purchaseDate?.toISOString(),
          price: i.price,
          barcode: i.barcode,
          notes: i.notes,
          isLow: i.isLow,
          reorderThreshold: i.reorderThreshold,
        })),
      };
    }),

  /**
   * Quick stats for the grocery dashboard
   */
  stats: withPermission('grocery:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const groceries = await getGroceriesCollection();
    const now = new Date();
    const sevenDays = new Date(now);
    sevenDays.setDate(now.getDate() + 7);

    const [total, expiring, low, byLocation] = await Promise.all([
      groceries.countDocuments({ householdId: auth.householdId }),
      groceries.countDocuments({
        householdId: auth.householdId,
        expiryDate: { $gte: now, $lte: sevenDays },
      }),
      groceries.countDocuments({
        householdId: auth.householdId,
        isLow: true,
      }),
      groceries
        .aggregate([
          { $match: { householdId: auth.householdId } },
          { $group: { _id: '$location', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    return {
      total,
      expiringSoon: expiring,
      lowStock: low,
      byLocation: byLocation.map((b) => ({
        location: b._id as string,
        count: b.count as number,
      })),
    };
  }),

  /**
   * Create a grocery item
   */
  create: withPermission('grocery:write')
    .input(createItemSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const groceries = await getGroceriesCollection();
      const now = new Date();

      const isLow =
        input.reorderThreshold !== undefined &&
        input.quantity <= input.reorderThreshold;

      const doc = {
        householdId: auth.householdId!,
        name: input.name,
        category: input.category,
        quantity: input.quantity,
        unit: input.unit,
        location: input.location,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
        purchaseDate: input.purchaseDate
          ? new Date(input.purchaseDate)
          : undefined,
        price: input.price,
        barcode: input.barcode,
        notes: input.notes,
        reorderThreshold: input.reorderThreshold,
        isLow,
        createdAt: now,
        updatedAt: now,
      };

      const result = await groceries.insertOne(doc as never);
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'grocery',
        result.insertedId,
        { name: input.name }
      );
      return { _id: result.insertedId.toString(), msg: 'Item added' };
    }),

  /**
   * Update a grocery item
   */
  update: withPermission('grocery:write')
    .input(updateItemSchema)
    .mutation(async ({ input, ctx }) => {
      const { itemId, ...updates } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const groceries = await getGroceriesCollection();

      const existing = await groceries.findOne({
        _id: new ObjectId(itemId),
        householdId: auth.householdId,
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }

      const updateDoc: Record<string, unknown> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) continue;
        if (key === 'expiryDate' || key === 'purchaseDate') {
          updateDoc[key] = value ? new Date(value as string) : undefined;
        } else {
          updateDoc[key] = value;
        }
      }

      const newQty =
        updates.quantity !== undefined ? updates.quantity : existing.quantity;
      const threshold =
        updates.reorderThreshold !== undefined
          ? updates.reorderThreshold
          : existing.reorderThreshold;
      if (threshold !== undefined) {
        updateDoc.isLow = newQty <= threshold;
      }

      await groceries.updateOne(
        { _id: new ObjectId(itemId) },
        { $set: updateDoc }
      );
      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'grocery',
        new ObjectId(itemId),
        updates
      );
      return { msg: 'Item updated' };
    }),

  /**
   * Delete a grocery item
   */
  delete: withPermission('grocery:delete')
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const groceries = await getGroceriesCollection();
      const result = await groceries.deleteOne({
        _id: new ObjectId(input.itemId),
        householdId: auth.householdId,
      });
      if (result.deletedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'grocery',
        new ObjectId(input.itemId)
      );
      return { msg: 'Item removed' };
    }),

  /**
   * Items expiring within N days (default 7)
   */
  expiring: withPermission('grocery:read')
    .input(z.object({ days: z.number().min(1).max(60).default(7) }))
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const groceries = await getGroceriesCollection();
      const now = new Date();
      const horizon = new Date(now);
      horizon.setDate(now.getDate() + input.days);

      const items = await groceries
        .find({
          householdId: auth.householdId,
          expiryDate: { $gte: now, $lte: horizon },
        })
        .sort({ expiryDate: 1 })
        .toArray();

      return items.map((i) => ({
        _id: i._id.toString(),
        name: i.name,
        location: i.location,
        quantity: i.quantity,
        unit: i.unit,
        expiryDate: i.expiryDate?.toISOString(),
        daysLeft: i.expiryDate
          ? Math.max(
              0,
              Math.ceil(
                (i.expiryDate.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : null,
      }));
    }),

  /**
   * Shopping list endpoints
   */
  shopping: router({
    list: withPermission('grocery:read').query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const lists = await getShoppingListsCollection();
      const items = await lists
        .find({ householdId: auth.householdId })
        .sort({ updatedAt: -1 })
        .toArray();
      return items.map((l) => ({
        _id: l._id.toString(),
        name: l.name,
        items: l.items,
        isCompleted: l.isCompleted,
        completedAt: l.completedAt?.toISOString(),
        createdAt: l.createdAt.toISOString(),
        itemCount: l.items?.length ?? 0,
        purchasedCount: (l.items ?? []).filter((i) => i.isPurchased).length,
      }));
    }),

    get: withPermission('grocery:read')
      .input(z.object({ listId: z.string() }))
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const lists = await getShoppingListsCollection();
        const list = await lists.findOne({
          _id: new ObjectId(input.listId),
          householdId: auth.householdId,
        });
        if (!list) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'List not found' });
        }
        return {
          _id: list._id.toString(),
          name: list.name,
          items: list.items,
          isCompleted: list.isCompleted,
        };
      }),

    create: withPermission('grocery:write')
      .input(createShoppingListSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const lists = await getShoppingListsCollection();
        const now = new Date();
        const doc = {
          householdId: auth.householdId!,
          name: input.name,
          items: input.items.map((i) => ({
            ...i,
            isPurchased: false,
            groceryItemId: i.groceryItemId
              ? new ObjectId(i.groceryItemId)
              : undefined,
            recipeId: i.recipeId ? new ObjectId(i.recipeId) : undefined,
          })),
          isCompleted: false,
          createdAt: now,
          updatedAt: now,
        };
        const result = await lists.insertOne(doc as never);
        return { _id: result.insertedId.toString(), msg: 'List created' };
      }),

    addItems: withPermission('grocery:write')
      .input(addItemsToListSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const lists = await getShoppingListsCollection();
        const newItems = input.items.map((i) => ({
          ...i,
          isPurchased: false,
          groceryItemId: i.groceryItemId
            ? new ObjectId(i.groceryItemId)
            : undefined,
          recipeId: i.recipeId ? new ObjectId(i.recipeId) : undefined,
        }));
        const result = await lists.updateOne(
          {
            _id: new ObjectId(input.listId),
            householdId: auth.householdId,
          },
          {
            $push: { items: { $each: newItems } },
            $set: { updatedAt: new Date() },
          } as never
        );
        if (result.matchedCount === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'List not found' });
        }
        return { msg: 'Items added' };
      }),

    togglePurchased: withPermission('grocery:write')
      .input(togglePurchasedSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const lists = await getShoppingListsCollection();
        const list = await lists.findOne({
          _id: new ObjectId(input.listId),
          householdId: auth.householdId,
        });
        if (!list || !list.items[input.itemIndex]) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
        }
        const isPurchased = !list.items[input.itemIndex].isPurchased;
        const allPurchased = list.items.every((it, idx) =>
          idx === input.itemIndex ? isPurchased : it.isPurchased
        );
        await lists.updateOne(
          { _id: list._id },
          {
            $set: {
              [`items.${input.itemIndex}.isPurchased`]: isPurchased,
              isCompleted: allPurchased,
              completedAt: allPurchased ? new Date() : undefined,
              updatedAt: new Date(),
            },
          }
        );
        return { msg: 'Updated', isPurchased };
      }),

    delete: withPermission('grocery:delete')
      .input(z.object({ listId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const lists = await getShoppingListsCollection();
        const result = await lists.deleteOne({
          _id: new ObjectId(input.listId),
          householdId: auth.householdId,
        });
        if (result.deletedCount === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'List not found' });
        }
        return { msg: 'List removed' };
      }),
  }),
});
