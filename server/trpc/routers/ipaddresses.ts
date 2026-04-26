import { z } from 'zod';
import { router } from '@/server/trpc';
import { rateLimitedProcedure } from '@/server/trpc/trpc';
import { getSysinfoDatabase } from '@/lib/mongodb';

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const ipaddressesRouter = router({
  /**
   * List IP addresses with pagination
   */
  list: rateLimitedProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const db = await getSysinfoDatabase();
      const collection = db.collection('ipaddress');

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
