import type { NextApiRequest, NextApiResponse } from 'next';
import { getSysinfoDatabase } from '@/lib/mongodb';
import { checkDefaultRateLimit, getClientIp } from '@/lib/rateLimit';
import { getPaginationParams, createPaginationMeta } from '@/lib/pagination';
import type { PaginatedApiResponse, IPAddress } from '@/types';

async function getIPaddress(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedApiResponse<IPAddress>>
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

        // Using connection pool for improved performance
        const db = await getSysinfoDatabase();

        const ipaddressesCollection = db.collection<IPAddress>('ipaddress');

        // Get pagination parameters
        const { page, limit, skip } = getPaginationParams(req);

        // Get total count
        const total = await ipaddressesCollection.countDocuments();

        // Fetch paginated IP addresses
        const result = await ipaddressesCollection
            .find()
            .skip(skip)
            .limit(limit)
            .toArray();

        const pagination = createPaginationMeta(page, limit, total);

        res.status(200).json({
            success: true,
            data: result,
            pagination
        });

    } catch (error) {
        console.error('IP address fetch error:', error);
        res.status(500).json({
            success: false,
            error: { msg: 'Internal server error' }
        });
    }
}

export default getIPaddress;