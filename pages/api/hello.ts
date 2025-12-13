import type { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/mongodb';
import { checkDefaultRateLimit, getClientIp } from '@/lib/rateLimit';
import type { ApiResponse } from '@/types';

interface MeetupCreateResponse {
  msg: string;
  insertedId: string;
}

async function myapi(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MeetupCreateResponse>>
) {
    if (req.method !== 'POST') {
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
            return res.status(429).json({
                success: false,
                error: {
                    msg: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds`
                }
            }).setHeader('Retry-After', rateLimit.retryAfter);
        }

        const data = req.body;

        if (!data) {
            return res.status(400).json({
                success: false,
                error: { msg: 'Request body is required' }
            });
        }

        // Get database connection
        const db = await getDatabase();
        const meetupsCollection = db.collection('meetups');

        // Insert new meetup
        const result = await meetupsCollection.insertOne(data);

        if (!result.acknowledged || !result.insertedId) {
            return res.status(500).json({
                success: false,
                error: { msg: 'Failed to create meetup' }
            });
        }

        res.status(201).json({
            success: true,
            data: {
                msg: 'Meetup created successfully',
                insertedId: result.insertedId
            }
        });

    } catch (error) {
        console.error('Meetup creation error:', error);
        res.status(500).json({
            success: false,
            error: { msg: 'Internal server error' }
        });
    }
}

export default myapi;