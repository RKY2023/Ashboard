import { z } from 'zod';
import { router } from '@/server/trpc';
import { rateLimitedProcedure } from '@/server/trpc/trpc';
import { getDatabase } from '@/lib/mongodb';

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const meetupsRouter = router({
  /**
   * List meetups with pagination
   */
  list: rateLimitedProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const db = await getDatabase();
      const collection = db.collection('meetups');

      const [items, total] = await Promise.all([
        collection.find({}).skip(skip).limit(limit).toArray(),
        collection.countDocuments(),
      ]);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),
});
