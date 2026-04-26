import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getTransactionsCollection,
  getBudgetsCollection,
  getFinanceCategoriesCollection,
  getAccountsCollection,
  getRecurringPaymentsCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';

const txTypeEnum = z.enum(['income', 'expense']);
const accountTypeEnum = z.enum([
  'checking',
  'savings',
  'credit',
  'cash',
  'investment',
]);
const frequencyEnum = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]);

const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  type: txTypeEnum,
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().optional(),
});

const createTransactionSchema = z.object({
  type: txTypeEnum,
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  categoryId: z.string(),
  accountId: z.string().optional(),
  description: z.string().min(1).max(500),
  date: z.string().datetime(),
  payee: z.string().max(120).optional(),
  tags: z.array(z.string().max(40)).default([]),
  groceryItemIds: z.array(z.string()).optional(),
});

const updateTransactionSchema = createTransactionSchema.partial().extend({
  transactionId: z.string(),
});

const listTransactionsSchema = z.object({
  type: txTypeEnum.optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(50),
});

const upsertBudgetSchema = z.object({
  budgetId: z.string().optional(),
  name: z.string().min(1).max(80),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  totalLimit: z.number().min(0),
  categories: z.array(
    z.object({
      categoryId: z.string(),
      name: z.string().min(1).max(60),
      limit: z.number().min(0),
      alertThreshold: z.number().min(0).max(100).default(80),
    })
  ),
});

const createAccountSchema = z.object({
  name: z.string().min(1).max(60),
  type: accountTypeEnum,
  balance: z.number().default(0),
  currency: z.string().default('USD'),
});

const upsertRecurringSchema = z.object({
  recurringId: z.string().optional(),
  name: z.string().min(1).max(120),
  type: txTypeEnum,
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  categoryId: z.string(),
  accountId: z.string().optional(),
  frequency: frequencyEnum,
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

export const financeRouter = router({
  /**
   * Categories
   */
  categories: router({
    list: withPermission('finance:read').query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const cats = await getFinanceCategoriesCollection();
      const items = await cats
        .find({ householdId: auth.householdId })
        .sort({ type: 1, name: 1 })
        .toArray();
      return items.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        parentId: c.parentId?.toString(),
        isSystem: c.isSystem,
      }));
    }),

    create: withPermission('finance:write')
      .input(createCategorySchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const cats = await getFinanceCategoriesCollection();
        const now = new Date();
        const doc = {
          householdId: auth.householdId!,
          name: input.name,
          type: input.type,
          icon: input.icon,
          color: input.color,
          parentId: input.parentId
            ? new ObjectId(input.parentId)
            : undefined,
          isSystem: false,
          createdAt: now,
          updatedAt: now,
        };
        const result = await cats.insertOne(doc as never);
        return { _id: result.insertedId.toString() };
      }),

    delete: withPermission('finance:delete')
      .input(z.object({ categoryId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const cats = await getFinanceCategoriesCollection();
        const result = await cats.deleteOne({
          _id: new ObjectId(input.categoryId),
          householdId: auth.householdId,
          isSystem: { $ne: true },
        });
        if (result.deletedCount === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Category not found or system-managed',
          });
        }
        return { msg: 'Category removed' };
      }),
  }),

  /**
   * Accounts
   */
  accounts: router({
    list: withPermission('finance:read').query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const accounts = await getAccountsCollection();
      const items = await accounts
        .find({ householdId: auth.householdId, isActive: true })
        .sort({ name: 1 })
        .toArray();
      return items.map((a) => ({
        _id: a._id.toString(),
        name: a.name,
        type: a.type,
        balance: a.balance,
        currency: a.currency,
      }));
    }),

    create: withPermission('finance:write')
      .input(createAccountSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const accounts = await getAccountsCollection();
        const now = new Date();
        const result = await accounts.insertOne({
          householdId: auth.householdId!,
          ...input,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        } as never);
        return { _id: result.insertedId.toString() };
      }),
  }),

  /**
   * Transactions
   */
  transactions: router({
    list: withPermission('finance:read')
      .input(listTransactionsSchema)
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const txs = await getTransactionsCollection();
        const cats = await getFinanceCategoriesCollection();

        const query: Record<string, unknown> = {
          householdId: auth.householdId,
        };
        if (input.type) query.type = input.type;
        if (input.categoryId)
          query.categoryId = new ObjectId(input.categoryId);
        if (input.accountId) query.accountId = new ObjectId(input.accountId);
        if (input.search)
          query.description = { $regex: input.search, $options: 'i' };
        if (input.startDate || input.endDate) {
          const range: Record<string, Date> = {};
          if (input.startDate) range.$gte = new Date(input.startDate);
          if (input.endDate) range.$lte = new Date(input.endDate);
          query.date = range;
        }

        const skip = (input.page - 1) * input.pageSize;
        const [total, items] = await Promise.all([
          txs.countDocuments(query),
          txs
            .find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(input.pageSize)
            .toArray(),
        ]);

        const categoryDocs = await cats
          .find({ householdId: auth.householdId })
          .toArray();
        const catMap = new Map(
          categoryDocs.map((c) => [c._id.toString(), c.name])
        );

        return {
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
          items: items.map((t) => ({
            _id: t._id.toString(),
            type: t.type,
            amount: t.amount,
            currency: t.currency,
            categoryId: t.categoryId.toString(),
            categoryName: catMap.get(t.categoryId.toString()) ?? 'Uncategorized',
            accountId: t.accountId?.toString(),
            description: t.description,
            date: t.date.toISOString(),
            payee: t.payee,
            tags: t.tags,
          })),
        };
      }),

    create: withPermission('finance:write')
      .input(createTransactionSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const txs = await getTransactionsCollection();
        const now = new Date();
        const doc = {
          householdId: auth.householdId!,
          type: input.type,
          amount: input.amount,
          currency: input.currency,
          categoryId: new ObjectId(input.categoryId),
          accountId: input.accountId
            ? new ObjectId(input.accountId)
            : undefined,
          description: input.description,
          date: new Date(input.date),
          payee: input.payee,
          tags: input.tags,
          isRecurring: false,
          groceryItemIds: input.groceryItemIds?.map((id) => new ObjectId(id)),
          createdAt: now,
          updatedAt: now,
        };
        const result = await txs.insertOne(doc as never);
        await auditHelpers.logCreate(
          auth.userId,
          auth.householdId!,
          'transaction',
          result.insertedId,
          { amount: input.amount, type: input.type }
        );
        return { _id: result.insertedId.toString() };
      }),

    update: withPermission('finance:write')
      .input(updateTransactionSchema)
      .mutation(async ({ input, ctx }) => {
        const { transactionId, ...updates } = input;
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const txs = await getTransactionsCollection();

        const updateDoc: Record<string, unknown> = { updatedAt: new Date() };
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined) continue;
          if (key === 'categoryId') {
            updateDoc.categoryId = new ObjectId(value as string);
          } else if (key === 'accountId') {
            updateDoc.accountId = new ObjectId(value as string);
          } else if (key === 'date') {
            updateDoc.date = new Date(value as string);
          } else if (key === 'groceryItemIds' && Array.isArray(value)) {
            updateDoc.groceryItemIds = (value as string[]).map(
              (id) => new ObjectId(id)
            );
          } else {
            updateDoc[key] = value;
          }
        }

        const result = await txs.updateOne(
          {
            _id: new ObjectId(transactionId),
            householdId: auth.householdId,
          },
          { $set: updateDoc }
        );
        if (result.matchedCount === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Transaction not found',
          });
        }
        return { msg: 'Transaction updated' };
      }),

    delete: withPermission('finance:delete')
      .input(z.object({ transactionId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const txs = await getTransactionsCollection();
        const result = await txs.deleteOne({
          _id: new ObjectId(input.transactionId),
          householdId: auth.householdId,
        });
        if (result.deletedCount === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Transaction not found',
          });
        }
        return { msg: 'Transaction removed' };
      }),
  }),

  /**
   * Budgets
   */
  budgets: router({
    list: withPermission('finance:read').query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const budgets = await getBudgetsCollection();
      const items = await budgets
        .find({ householdId: auth.householdId })
        .sort({ year: -1, month: -1 })
        .toArray();
      return items.map((b) => ({
        _id: b._id.toString(),
        name: b.name,
        month: b.month,
        year: b.year,
        totalLimit: b.totalLimit,
        categoryCount: b.categories?.length ?? 0,
      }));
    }),

    forCurrentMonth: withPermission('finance:read').query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const budgets = await getBudgetsCollection();
      const txs = await getTransactionsCollection();

      const budget = await budgets.findOne({
        householdId: auth.householdId,
        month,
        year,
      });

      if (!budget) {
        return { budget: null, spent: 0, remaining: 0, categories: [] };
      }

      const { start, end } = monthRange(year, month);
      const monthTxs = await txs
        .find({
          householdId: auth.householdId,
          type: 'expense',
          date: { $gte: start, $lt: end },
        })
        .toArray();

      const spentByCategory = new Map<string, number>();
      let totalSpent = 0;
      for (const t of monthTxs) {
        const cid = t.categoryId.toString();
        spentByCategory.set(cid, (spentByCategory.get(cid) ?? 0) + t.amount);
        totalSpent += t.amount;
      }

      return {
        budget: {
          _id: budget._id.toString(),
          name: budget.name,
          month: budget.month,
          year: budget.year,
          totalLimit: budget.totalLimit,
        },
        spent: totalSpent,
        remaining: budget.totalLimit - totalSpent,
        categories: budget.categories.map((c) => ({
          categoryId: c.categoryId.toString(),
          name: c.name,
          limit: c.limit,
          spent: spentByCategory.get(c.categoryId.toString()) ?? 0,
          alertThreshold: c.alertThreshold,
        })),
      };
    }),

    upsert: withPermission('finance:write')
      .input(upsertBudgetSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const budgets = await getBudgetsCollection();
        const now = new Date();

        const categories = input.categories.map((c) => ({
          ...c,
          categoryId: new ObjectId(c.categoryId),
          spent: 0,
        }));

        if (input.budgetId) {
          await budgets.updateOne(
            {
              _id: new ObjectId(input.budgetId),
              householdId: auth.householdId,
            },
            {
              $set: {
                name: input.name,
                month: input.month,
                year: input.year,
                totalLimit: input.totalLimit,
                categories,
                updatedAt: now,
              },
            }
          );
          return { _id: input.budgetId, msg: 'Budget updated' };
        }

        const result = await budgets.insertOne({
          householdId: auth.householdId!,
          name: input.name,
          month: input.month,
          year: input.year,
          totalLimit: input.totalLimit,
          categories,
          createdAt: now,
          updatedAt: now,
        } as never);
        return { _id: result.insertedId.toString(), msg: 'Budget created' };
      }),
  }),

  /**
   * Recurring payments
   */
  recurring: router({
    list: withPermission('finance:read').query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const items = await getRecurringPaymentsCollection();
      const list = await items
        .find({ householdId: auth.householdId, isActive: true })
        .sort({ nextDueDate: 1 })
        .toArray();
      return list.map((r) => ({
        _id: r._id.toString(),
        name: r.name,
        type: r.type,
        amount: r.amount,
        currency: r.currency,
        frequency: r.frequency,
        nextDueDate: r.nextDueDate.toISOString(),
        categoryId: r.categoryId.toString(),
      }));
    }),

    upsert: withPermission('finance:write')
      .input(upsertRecurringSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const items = await getRecurringPaymentsCollection();
        const now = new Date();
        const start = new Date(input.startDate);
        const next = new Date(start);

        if (input.recurringId) {
          await items.updateOne(
            {
              _id: new ObjectId(input.recurringId),
              householdId: auth.householdId,
            },
            {
              $set: {
                name: input.name,
                type: input.type,
                amount: input.amount,
                currency: input.currency,
                categoryId: new ObjectId(input.categoryId),
                accountId: input.accountId
                  ? new ObjectId(input.accountId)
                  : undefined,
                frequency: input.frequency,
                startDate: start,
                endDate: input.endDate ? new Date(input.endDate) : undefined,
                updatedAt: now,
              },
            }
          );
          return { _id: input.recurringId };
        }

        const result = await items.insertOne({
          householdId: auth.householdId!,
          name: input.name,
          type: input.type,
          amount: input.amount,
          currency: input.currency,
          categoryId: new ObjectId(input.categoryId),
          accountId: input.accountId
            ? new ObjectId(input.accountId)
            : undefined,
          frequency: input.frequency,
          startDate: start,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          nextDueDate: next,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        } as never);
        return { _id: result.insertedId.toString() };
      }),
  }),

  /**
   * Reports & analytics
   */
  reports: router({
    summary: withPermission('finance:read')
      .input(
        z
          .object({
            month: z.number().min(1).max(12).optional(),
            year: z.number().min(2000).max(2100).optional(),
          })
          .default({})
      )
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const txs = await getTransactionsCollection();
        const now = new Date();
        const month = input.month ?? now.getMonth() + 1;
        const year = input.year ?? now.getFullYear();
        const { start, end } = monthRange(year, month);

        const result = await txs
          .aggregate([
            {
              $match: {
                householdId: auth.householdId,
                date: { $gte: start, $lt: end },
              },
            },
            {
              $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const income = result.find((r) => r._id === 'income')?.total ?? 0;
        const expense = result.find((r) => r._id === 'expense')?.total ?? 0;
        return {
          month,
          year,
          income,
          expense,
          net: income - expense,
        };
      }),

    byCategory: withPermission('finance:read')
      .input(
        z.object({
          month: z.number().min(1).max(12).optional(),
          year: z.number().min(2000).max(2100).optional(),
          type: txTypeEnum.default('expense'),
        })
      )
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const txs = await getTransactionsCollection();
        const cats = await getFinanceCategoriesCollection();
        const now = new Date();
        const month = input.month ?? now.getMonth() + 1;
        const year = input.year ?? now.getFullYear();
        const { start, end } = monthRange(year, month);

        const grouped = await txs
          .aggregate([
            {
              $match: {
                householdId: auth.householdId,
                type: input.type,
                date: { $gte: start, $lt: end },
              },
            },
            {
              $group: {
                _id: '$categoryId',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
            { $sort: { total: -1 } },
          ])
          .toArray();

        const ids = grouped
          .map((g) => g._id)
          .filter((id): id is ObjectId => id instanceof ObjectId);
        const categoryDocs = ids.length
          ? await cats.find({ _id: { $in: ids } }).toArray()
          : [];
        const catMap = new Map(
          categoryDocs.map((c) => [c._id.toString(), c])
        );

        return grouped.map((g) => {
          const cat = g._id ? catMap.get(g._id.toString()) : undefined;
          return {
            categoryId: g._id?.toString() ?? null,
            name: cat?.name ?? 'Uncategorized',
            color: cat?.color,
            total: g.total as number,
            count: g.count as number,
          };
        });
      }),

    /**
     * Daily totals across the last N days for the line chart
     */
    daily: withPermission('finance:read')
      .input(z.object({ days: z.number().min(1).max(366).default(30) }))
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const txs = await getTransactionsCollection();
        const start = new Date();
        start.setDate(start.getDate() - input.days);
        start.setHours(0, 0, 0, 0);

        const buckets = await txs
          .aggregate([
            {
              $match: {
                householdId: auth.householdId,
                date: { $gte: start },
              },
            },
            {
              $group: {
                _id: {
                  date: {
                    $dateToString: { format: '%Y-%m-%d', date: '$date' },
                  },
                  type: '$type',
                },
                total: { $sum: '$amount' },
              },
            },
            { $sort: { '_id.date': 1 } },
          ])
          .toArray();

        const byDate = new Map<string, { income: number; expense: number }>();
        for (const b of buckets) {
          const key = b._id.date as string;
          const entry = byDate.get(key) ?? { income: 0, expense: 0 };
          if (b._id.type === 'income') entry.income += b.total;
          else entry.expense += b.total;
          byDate.set(key, entry);
        }

        return Array.from(byDate.entries()).map(([date, totals]) => ({
          date,
          ...totals,
          net: totals.income - totals.expense,
        }));
      }),

    /**
     * Grocery spending in the current month — total of transactions linked to grocery items
     */
    grocerySpending: withPermission('finance:read')
      .input(
        z
          .object({
            month: z.number().min(1).max(12).optional(),
            year: z.number().min(2000).max(2100).optional(),
          })
          .default({})
      )
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const txs = await getTransactionsCollection();
        const now = new Date();
        const month = input.month ?? now.getMonth() + 1;
        const year = input.year ?? now.getFullYear();
        const { start, end } = monthRange(year, month);

        const result = await txs
          .aggregate([
            {
              $match: {
                householdId: auth.householdId,
                type: 'expense',
                date: { $gte: start, $lt: end },
                groceryItemIds: { $exists: true, $ne: [] },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        return {
          month,
          year,
          total: result[0]?.total ?? 0,
          transactionCount: result[0]?.count ?? 0,
        };
      }),
  }),
});
