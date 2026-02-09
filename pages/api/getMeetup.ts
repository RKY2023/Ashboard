import type { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/mongodb';
import { checkDefaultRateLimit, getClientIp } from '@/lib/rateLimit';
import { getPaginationParams, createPaginationMeta } from '@/lib/pagination';
import type { PaginatedApiResponse, Meetup } from '@/types';

async function getMeetup(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedApiResponse<Meetup>>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: { msg: 'Method not allowed' }
        });
    }

    try {
        // Rate limiting check
        const clientIp = getClientIp(req);
        const rateLimit = await checkDefaultRateLimit(clientIp);

        if (!rateLimit.allowed) {
            res.setHeader('Retry-After', rateLimit.retryAfter || 0);
            return res.status(429).json({
                success: false,
                error: {
                    msg: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds`
                }
            });
        }

        // Get database connection
        const db = await getDatabase();
        const meetupsCollection = db.collection<Meetup>('meetups');

        // Get pagination parameters
        const { page, limit, skip } = getPaginationParams(req);

        // Get total count
        const total = await meetupsCollection.countDocuments();

        // Fetch paginated meetups
        const meetups = await meetupsCollection
            .find()
            .skip(skip)
            .limit(limit)
            .toArray();

        const pagination = createPaginationMeta(page, limit, total);

        res.status(200).json({
            success: true,
            data: meetups,
            pagination
        });

    } catch (error) {
        console.error('Meetup fetch error:', error);
        res.status(500).json({
            success: false,
            error: { msg: 'Internal server error' }
        });
    }
}

export default getMeetup;