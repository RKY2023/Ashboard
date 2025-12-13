import { getDatabase } from '@/lib/mongodb';
import { checkDefaultRateLimit, getClientIp } from '@/lib/rateLimit';

async function getMeetup(req, res) {
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
            return res.status(429).json({
                success: false,
                error: {
                    msg: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds`
                }
            }).setHeader('Retry-After', rateLimit.retryAfter);
        }

        // Get database connection
        const db = await getDatabase();
        const meetupsCollection = db.collection('meetups');

        // Fetch all meetups
        const meetups = await meetupsCollection.find().toArray();

        res.status(200).json({
            success: true,
            data: meetups
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