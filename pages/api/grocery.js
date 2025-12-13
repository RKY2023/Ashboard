import { MongoClient } from 'mongodb';
import { checkDefaultRateLimit, getClientIp } from '@/lib/rateLimit';

async function getGroceries(req, res) {
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

        // Note: This route uses a different database (CSV)
        // For production, consider using the connection pool in lib/mongodb.ts
        const client = await MongoClient.connect(process.env.API_URL);
        const db = client.db('CSV');

        const groceriesCollection = db.collection('groceries');
        const result = await groceriesCollection.find().toArray();

        client.close();

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Groceries fetch error:', error);
        res.status(500).json({
            success: false,
            error: { msg: 'Internal server error' }
        });
    }
}

export default getGroceries;